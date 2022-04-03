addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const stopId = url.searchParams.get('stopId')

  if (!stopId) {
    return new Response('Bad request.', { status: 400 })
  }

  const stopUrl = `https://nctx.co.uk/stops/${stopId}`
  const stopPage = await fetch(stopUrl)

  const departures = []
  let currentDeparture = {}
  let stopName = ''

  const something = await new HTMLRewriter()
    .on('h1.place-info-banner__name', {
      text(text) {
        // Take the first match.
        if (text.text.length > 0 && stopName.length === 0) {
          stopName = text.text.trim()
        }
      },
    })
    .on('div.single-visit__highlight', {
      element(elem) {
        // Pull this out of the style attribute whose value looks like: background-color:#92D400;
        const styleAttr = elem.getAttribute('style')
        const routeColour = styleAttr.substring(
          'background-color:'.length,
          styleAttr.length - 1,
        )
        currentDeparture.routeColour = routeColour

        // TODO translate the colour into an additional more human readable line colour name
        // Need to get the official line colour names...
        currentDeparture.routeColourName = 'TODO'
      },
    })
    .on('p.single-visit__name', {
      text(text) {
        if (text.text.length > 0) {
          currentDeparture.routeNumber = text.text.trim()
        }
      },
    })
    .on('p.single-visit__description', {
      text(text) {
        if (text.text.length > 0) {
          currentDeparture.destination = text.text.trim()
        }
      },
    })
    .on('div.single-visit__time--expected', {
      // Bus has live tracking, value will be "Due" or a number of minutee e.g. "2 mins".
      text(text) {
        if (text.text.length > 0) {
          const trimmedText = text.text.trim()
          currentDeparture.expected = trimmedText

          // When due, the bus is expected in 0 minutes.
          if (trimmedText.toLowerCase() === 'due') {
            currentDeparture.expectedMins = 0
          } else {
            // Parse out the number of minutes.
            currentDeparture.expectedMins = parseInt(
              trimmedText.split(' ')[0],
              10,
            )
          }

          currentDeparture.isRealTime = true

          departures.push(currentDeparture)
          currentDeparture = {}
        }
      },
    })
    .on('div.single-visit__time--aimed', {
      // Bus does not have live tracking, value will be "Due" or a clock time e.g. "22:30".
      // For clock times we don't (yet) calculate the expectedMins value.
      text(text) {
        if (text.text.length > 0) {
          const trimmedText = text.text.trim()
          currentDeparture.expected = trimmedText

          // When due, the bus is expected in 0 minutes.
          if (trimmedText.toLowerCase() === 'due') {
            currentDeparture.expectedMins = 0
          }
          // TODO calculate number of minutes in the future that the value of trimmedText
          // represents (value is a clock time e.g. 22:30) and store in expectedMins.

          currentDeparture.isRealTime = false

          departures.push(currentDeparture)
          currentDeparture = {}
        }
      },
    })
    .transform(stopPage)
    .text()

  const results = {
    stopId,
    stopName,
    departures: departures,
  }

  // Filter by route colour (hex code) if needed.
  const routeColourToFilter = url.searchParams.get('routeColour')
  if (routeColourToFilter) {
    console.log('FILTERING BY ROUTE COLOUR')
    results.departures = results.departures.filter(departure => departure.routeColour === `#${routeColourToFilter}`)
  }

  // Filter by route if needed... route 69 includes 69A, 69X etc but not 169 or 690.
  const routeToFilter = url.searchParams.get('routeNumber')
  if (routeToFilter) {
    results.departures = results.departures.filter(departure => {
      if (!departure.routeNumber) {
        // Seems to be we get the odd bit of bad data, so throw it.
        return false
      }
      const lastChar = departure.routeNumber.substring(
        departure.routeNumber.length - 1,
      )
      const numberChars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

      // Route number either needs to match exactly, or start with the provded route number and
      // not end in a number... so if we're looking for route 58 this should return route 58,
      // 58A, 58X but not 590.  This also allows us to be more specific and look for 58X.
      // You could probably use a regular expression here but I find they introduce more issues
      // than they solve, so I avoid them :)
      return (
        departure.routeNumber === routeToFilter ||
        (departure.routeNumber.startsWith(routeToFilter) &&
          !numberChars.includes(lastChar))
      )
    })
  }

  // Filter out results that aren't realtime estimates if realTimeOnly is set to any value.
  if (url.searchParams.get('realTimeOnly')) {
    results.departures = results.departures.filter(
      departure => departure.isRealTime,
    )
  }

  // Filter out results that arrive more than a given number of minutes into the future.
  const maxWaitTime = parseInt(url.searchParams.get('maxWaitTime'), 10)
  if (maxWaitTime) {
    results.departures = results.departures.filter(
      departure =>
        departure.hasOwnProperty('expectedMins') &&
        departure.expectedMins <= maxWaitTime,
    )
  }

  // Limit the number of results returned if required.
  const maxResults = parseInt(url.searchParams.get('maxResults'), 10)
  if (maxResults) {
    results.departures.length = maxResults
  }

  // TODO return simple format or JSON?

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'content-type': 'application/json;charset=UTF-8' },
  })
}

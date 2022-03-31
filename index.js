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

  // TODO return only one bus route
  // TODO return only results with expected times in minutes
  // TODO return only so many results
  // TODO return simple format or JSON?

  return new Response(JSON.stringify(results, null, 2), {
    headers: { 'content-type': 'application/json;charset=UTF-8' },
  })
}

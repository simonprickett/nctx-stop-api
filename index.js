const BAD_REQUEST_TEXT = 'Bad request.'
const BAD_REQUEST_CODE = 400
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
}

// Maps line colour codes to line names.
const LINE_NAME_LOOKUP = {
  '#935E3A': 'brown',
  '#007A4D': 'green',
  '#CD202C': 'red',
  '#DA487E': 'pink',
  '#3FCFD5': 'turquoise',
  '#E37222': 'orange',
  '#6AADE4': 'skyblue',
  '#C1AFE5': 'lilac',
  '#FED100': 'yellow',
  '#522398': 'purple',
  '#002663': 'navy',
  '#B5B6B3': 'grey',
  '#00A1DE': 'blue',
  '#92D400': 'lime',
}

// Used when filtering by route number.
const NUMBER_CHARS_LOOKUP = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

// Used when getting the current UK time... see
// https://stackoverflow.com/questions/25050034/get-iso-8601-using-intl-datetimeformat
const INTL_DATE_TIME_FORMAT_OPTIONS = {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZoneName: 'short',
}

// Use a locale that has adopted ISO 8601 as there is no locale for
// that directly so using Sweden here...
const INTL_DATE_TIME_FORMAT_LOCALE = 'sv-SE'

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const stopId = url.searchParams.get('stopId')

  if (request.method !== 'GET' || !stopId) {
    return new Response(BAD_REQUEST_TEXT, {
      status: BAD_REQUEST_CODE,
      headers: CORS_HEADERS,
    })
  }

  const stopUrl = `https://nctx.co.uk/stops/${stopId}`
  const stopPage = await fetch(stopUrl)

  const departures = []
  let currentDeparture = {}
  let stopName = ''

  const htmlRewriter = await new HTMLRewriter()
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
        currentDeparture.lineColour = routeColour
        currentDeparture.line = LINE_NAME_LOOKUP[routeColour]
      },
    })
    .on('div.single-visit__name', {
      text(text) {
        if (text.text.length > 0) {
          currentDeparture.routeNumber = text.text.trim()
        }
      },
    })
    .on('div.single-visit__description', {
      text(text) {
        if (text.text.length > 0) {
          currentDeparture.destination = text.text.trim()
        }
      },
    })
    .on('a.single-visit--expected', {
      text(text) {
        currentDeparture.isRealTime = true
      }
    })
    .on('a.single-visit--aimed', {
      text(text) {
        currentDeparture.isRealTime = false
      }
    })
    .on('div.single-visit__arrival-time__cell', {
      // TODO this also needs to cope with clock times now and is not a determinant of 
      // real time tracking.
      // Bus has live tracking, value will be "Due" or a number of minutes e.g. "2 mins".
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

          departures.push(currentDeparture)
          currentDeparture = {}
        }
      },
    })
    .on('TODO', { // This logic might need folding into the above and we might need to look elsewhere for realtime marker
      // Bus does not have live tracking, value will be "Due" or a clock time e.g. "22:30"
      // Sometimes though it's a number of minutes e.g. "59 mins".
      text(text) {
        if (text.text.length > 0) {
          const trimmedText = text.text.trim()
          currentDeparture.expected = trimmedText

          // When due, the bus is expected in 0 minutes.
          if (trimmedText.toLowerCase() === 'due') {
            currentDeparture.expectedMins = 0
          } else {
            // Calculate number of minutes in the future that the value of trimmedText
            // represents (value is a clock time e.g. 22:30) and store in expectedMins.
            // careful too as 00:10 could be today or tomorrow...

            if (trimmedText.indexOf(':') !== -1) {
              // This time is in the "hh:mm" 24hr format.
              const ukNow = new Date(
                new Intl.DateTimeFormat(
                  INTL_DATE_TIME_FORMAT_LOCALE,
                  INTL_DATE_TIME_FORMAT_OPTIONS,
                ).format(new Date()),
              )
              const departureDate = new Date(
                new Intl.DateTimeFormat(
                  INTL_DATE_TIME_FORMAT_LOCALE,
                  INTL_DATE_TIME_FORMAT_OPTIONS,
                ).format(new Date()),
              )

              // Zero these out for better comparisons at the minute level.
              ukNow.setSeconds(0)
              ukNow.setMilliseconds(0)
              departureDate.setSeconds(0)
              departureDate.setMilliseconds(0)

              const [departureHours, departureMins] = trimmedText.split(':')
              const departureHoursInt = parseInt(departureHours, 10)
              const departureMinsInt = parseInt(departureMins, 10)

              departureDate.setHours(departureHoursInt)
              departureDate.setMinutes(departureMinsInt)

              if (ukNow.getHours() > departureHoursInt) {
                // The departure is tomorrow e.g. it's now 23:00 and the departure is 00:20.
                departureDate.setDate(departureDate.getDate() + 1)
              }

              const millis = departureDate - ukNow
              const minsToDeparture = millis / 1000 / 60

              currentDeparture.expectedMins = minsToDeparture
            } else {
              // This time is in the "59 mins" format.
              currentDeparture.expectedMins = parseInt(
                trimmedText.split(' ')[0],
                10,
              )
            }
          }

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
    departures,
  }

  // Filter by line name if needed.
  const lineToFilter = url.searchParams.get('line')
  if (lineToFilter) {
    results.departures = results.departures.filter(
      departure => departure.line === lineToFilter,
    )
  }

  // Filter by line colour (hex code) if needed.
  const lineColourToFilter = url.searchParams.get('lineColour')
  if (lineColourToFilter) {
    results.departures = results.departures.filter(
      departure => departure.lineColour === `#${lineColourToFilter}`,
    )
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

      // Route number either needs to match exactly, or start with the provded route number and
      // not end in a number... so if we're looking for route 58 this should return route 58,
      // 58A, 58X but not 590.  This also allows us to be more specific and look for 58X.
      // You could probably use a regular expression here but I find they introduce more issues
      // than they solve, so I avoid them :)
      return (
        departure.routeNumber === routeToFilter ||
        (departure.routeNumber.startsWith(routeToFilter) &&
          !NUMBER_CHARS_LOOKUP.includes(lastChar))
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
  if (maxResults && results.departures.length > maxResults) {
    results.departures.length = maxResults
  }

  // Only return specified fields if required.
  if (url.searchParams.get('fields')) {
    const fieldsToReturn = url.searchParams.get('fields').split(',')

    if (fieldsToReturn.length > 0) {
      results.departures = results.departures.map(departure => {
        const newDeparture = {}
        for (const fieldName of fieldsToReturn) {
          newDeparture[fieldName] = departure[fieldName]
        }

        return newDeparture
      })
    }
  }

  // Format the response appropriately (default = JSON)
  const responseFormat = url.searchParams.get('format')
  if (!responseFormat || responseFormat === 'json') {
    return new Response(JSON.stringify(results, null, 2), {
      headers: {
        'content-type': 'application/json;charset=UTF-8',
        ...CORS_HEADERS,
      },
    })
  } else if (responseFormat === 'string') {
    let stringResults = `${results.stopId}|${results.stopName}`
    let stringDepartures = ''
    for (const departure of results.departures) {
      for (const val of Object.values(departure)) {
        stringDepartures = `${stringDepartures}${
          stringDepartures.length > 0 ? '^' : ''
        }${val}`
      }

      stringDepartures = `${stringDepartures}|`
    }

    stringResults = `${stringResults}|${
      stringDepartures.length > 0
        ? stringDepartures.substring(0, stringDepartures.length - 1)
        : ''
    }`
    return new Response(stringResults, { headers: CORS_HEADERS })
  } else {
    // Unknown format...
    return new Response(BAD_REQUEST_TEXT, {
      status: BAD_REQUEST_CODE,
      headers: CORS_HEADERS,
    })
  }
}

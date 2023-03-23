# Nottingham City Transport Bus Departures API

![Nottingham City Transport Bus at Forest Recreation Ground](bus_at_forest_rec.jpg)

## Overview

My local bus company [Nottingham City Transport](https://www.nctx.co.uk/) (NCTX) doesn't have an API for real time bus departures, and I couldn't find any other source of this data so I decided to make my own using [Cloudflare Workers](https://workers.cloudflare.com/) and a [screen scraping](https://en.wikipedia.org/wiki/Web_scraping) approach.

If you build a front end or interface to this, I'd love to see it. You can [get hold of me here](https://simonprickett.dev/contact/).  I also wrote about this project on [my website](https://simonprickett.dev/bus-stop-api-with-cloudflare-workers/).

## Running Locally

To run this locally, you'll need:

- [Git command line tools](https://git-scm.com/downloads) - to clone the project.
- [Node.js](https://nodejs.org/en/download/) - use the latest long term stable (LTS) version.
- [Cloudflare Wrangler](https://developers.cloudflare.com/workers/wrangler/) - a tool for developing and deploying Cloudflare Workers (requires a free [Cloudflare account](https://www.cloudflare.com/))
- A web browser, anything will do but I like [Google Chrome](https://www.google.com/chrome/).

First, get the code:

```bash
$ git clone https://github.com/simonprickett/nctx-stop-api.git
$ cd nctx-stop-api
```

Next, install Wrangler globally:

```bash
$ npm install -g wrangler
```

Install the project dependencies:

```bash
$ npm install
```

Now, you're ready to start a local copy of the worker:

```bash
 wrangler dev
 ⛅️ wrangler 2.13.0
--------------------
⬣ Listening at http://0.0.0.0:8787
- http://127.0.0.1:8787
- http://192.168.4.22:8787
```

The first time that you do this, you'll be prompted to login to Cloudflare and authorise Wrangler.  Follow the on screen instructions and prompts.

Test the worker locally by visiting: 

```text
http://localhost:8787/?stopId=3390FO07
```

## Deploying to Cloudflare Workers

When you're ready to publish the worker to the world and give it a public URL that's part of your Cloudflare account, use Wrangler:

```bash
$ wrangler publish
 ⛅️ wrangler 2.13.0
--------------------
Total Upload: 8.08 KiB / gzip: 2.13 KiB
Uploaded nctx (2.56 sec)
Published nctx (1.63 sec)
  https://nctx.<your cloudflare workers domain>.workers.dev
```

Once deployed, your worker will be accessible on the internet at the URL that Wrangler outputs at the end of the publishing process. Note that this is a `https` URL - Cloudflare takes care of SSL for you.

## Usage

### Obtaining a Bus Stop ID

This API works at the bus stop level, there's no endpoints to get a list of routes or stops. To make it work you'll need a bus stop ID. You can get one of these from the [Nottingham City Transport website](https://www.nctx.co.uk/) like so:

- Go to the Nottingham City Transport home page.
- Enter a location into the "Live Departures" search box (example locations: "Sherwood", "Gotham", "Victoria Centre"), or click "find your stop on the map".
- A map appears showing bus stops near your location - pick one and click on it.
- A pop up appears, click "Departures"
- You should now be looking at the live departure board for a stop. The stop ID is the final part of the page URL, for example given the URL `https://www.nctx.co.uk/stops/3390J1`, the stop ID is `3390J1`.
- Make a note of your stop ID and use it in the examples below.

### Requesting Departure Data for a Bus Stop

The following examples all use stop ID `3390FO07` ("Forest Recreation Ground"), and route numbers and line colours that pass through that stop.

All examples are `GET` requests, so you can just use a browser to try them out. You could also use [Postman](https://www.postman.com/). These examples assume you're running the worker code locally, just swap the URL to your production one if you've deployed it and want to run it in production.

#### Get All Departures

To get all the departures for a given stop ID go to the following URL:

```text
http://localhost:8787/?stopId=3390FO07
```

This returns a JSON response that looks like this:

```json
{
  "stopId": "3390FO07",
  "stopName": "Forest Recreation Ground",
  "departures": [
    {
      "lineColour": "#FED100",
      "line": "yellow",
      "routeNumber": "70",
      "destination": "City, Victoria Centre T3",
      "expected": "2 mins",
      "expectedMins": 2,
      "isRealTime": true
    },
    {
      "lineColour": "#935E3A",
      "line": "brown",
      "routeNumber": "16",
      "destination": "City, Victoria Centre T2",
      "expected": "3 mins",
      "expectedMins": 3,
      "isRealTime": true
    },
    {
      "lineColour": "#522398",
      "line": "purple",
      "routeNumber": "88",
      "destination": "City, Parliament St P4",
      "expected": "5 mins",
      "expectedMins": 5,
      "isRealTime": true
    }
  ]
}
```

The `stopId` field contains the ID of the stop that you provided. `stopName` contains the full name for that stop. The remainder of the response is contained in the `departures` array. Each departure has the following data fields:

- `lineColour`: a string containing the HTML colour code for the line that the bus is on. The buses run on colour coded lines, each line may contain up to three or four route numbers and all buses on the same line colour head in roughly the same direction.
- `line`: a string containing the name of the line that the bus is on. This is lowercase. See later in this document for a list of possible values.
- `routeNumber`: a string containing the route number. It's a string not a number because some routes have letters in them e.g. `N1`, `59A`, `1C`, `69X`.
- `destination`: where the bus route terminates / where the bus is headed to. This is a string.
- `expected`: when the bus is expected to arrive at the stop. This is a string value that takes one of two forms: `<number> mins` or `<hh>:<mm>` with the hours in 24 hour format.
- `expectedMins`: the number of minutes until the bus is expected to arrive at the stop. This will be an integer number, and `0` if the bus is due at the stop now.
- `isRealTime`: is a boolean that will be `true` if this departure is a real time estimate (the bus has tracking on it) or `false` otherwise... the bus either doesn't have tracking or hasn't started on the route yet, so timetable information is shown instead.

### Filtering / Limiting Data Returned

There are various ways in which you can filter and limit the data returned. These are all specified using extra parameters on the request, and can be combined together in a single request.

Use the filters by adding additional request parameters:

- `line` - to filter by a specific line colour using the line's name e.g. `&line=yellow`. Valid values for `line` are (note these are case sensitive):
  - `brown`
  - `green`
  - `red`
  - `pink`
  - `turquoise`
  - `orange`
  - `skyblue`
  - `lilac`
  - `yellow`
  - `purple`
  - `navy`
  - `grey`
  - `blue`
  - `lime`
- `lineColour` - to filter by a specific line colour using the line's HTML colour code e.g. `&lineColour=#3FCFD5`. Valid values for `lineColour` are (note these are case sensitive):
  - `#935E3A` (brown)
  - `#007A4D` (green)
  - `#CD202C` (red)
  - `#DA487E` (pink)
  - `#3FCFD5` (turquoise)
  - `#E37222` (orange)
  - `#6AADE4` (skyblue)
  - `#C1AFE5` (lilac)
  - `#FED100` (yellow)
  - `#522398` (purple)
  - `#002663` (navy)
  - `#B5B6B3` (grey)
  - `#00A1DE` (blue)
  - `#92D400` (lime)
- `routeNumber` - to filter by a specific route number. This will also return variants of that route number for example `&routeNumber=69` will return `69`, `69A`, `69X` etc. `&routeNumber=69X` will only return `69X`.
- `realTimeOnly` - set to true to return only departures that have real time estimates (where the bus is reporting its live location). Example: `&realTimeOnly=true`. Note: Setting `realTimeOnly` to any value whatsover turns on this filter.
- `maxWaitTime` - use to filter departures that are due in the next so many minutes. Example: `&maxWaitTime=10`.
- `maxResults` - only return the first so many results (or fewer if there aren't that many matches). To get the first 5: `&maxResults=5`.

Example showing how to combine these... let's get up to 4 yellow line departures in the next 60 mins:

```text
http://localhost:8787/?stopId=3390FO07&line=yellow&maxWaitTime=60&maxResults=4
```

The order of the arguments doesn't matter.

### Specifying the Format for Data Returned

The worker can return data in two different formats...

#### JSON Responses

JSON is the default response format, which is described earlier in this document. There's no need to do this but you can set the `format` request parameter to `json` if you like:

```text
http://localhost:8787/?stopId=3390FO07&maxResults=3&format=json
```

The response looks like this:

```json
{
  "stopId": "3390FO07",
  "stopName": "Forest Recreation Ground",
  "departures": [
    {
      "lineColour": "#FED100",
      "line": "yellow",
      "routeNumber": "69",
      "destination": "City, Victoria Centre T4",
      "expected": "1 min",
      "expectedMins": 1,
      "isRealTime": true
    },
    {
      "lineColour": "#935E3A",
      "line": "brown",
      "routeNumber": "15",
      "destination": "City, Victoria Centre T2",
      "expected": "2 mins",
      "expectedMins": 2,
      "isRealTime": true
    },
    {
      "lineColour": "#FED100",
      "line": "yellow",
      "routeNumber": "68",
      "destination": "City, Victoria Centre T4",
      "expected": "4 mins",
      "expectedMins": 4,
      "isRealTime": true
    }
  ]
}
```

If you opt to use the `fields` request parameter, only the fields you ask for will be returned:

```text
http://localhost:8787/?stopId=3390FO07&format=json&maxResults=3&fields=line,routeNumber,expected
```

returns:

```json
{
  "stopId": "3390FO07",
  "stopName": "Forest Recreation Ground",
  "departures": [
    {
      "line": "yellow",
      "routeNumber": "69",
      "expected": "1 min"
    },
    {
      "line": "brown",
      "routeNumber": "15",
      "expected": "2 mins"
    },
    {
      "line": "yellow",
      "routeNumber": "68",
      "expected": "5 mins"
    }
  ]
}
```

#### Delimited String Responses

The worker can also return delimited string responses. You might want to use these when processing the response on a device with limited capabilities, where a JSON parser might not be viable. To get a string response set the `format` request parameter to `string`:

```text
http://localhost:8787/?stopId=3390FO07&format=string&maxResults=3
```

The response format looks like this:

```
3390FO07|Forest Recreation Ground|#FED100^yellow^68^City, Victoria Centre T4^1 min^1^true|^#92D400^lime^56^City, Parliament St P2^4 mins^4^true|^#522398^purple^89^City, Parliament St P5^5 mins^5^true
```

The following fields are returned, separated by `|` characters:

- The stop ID.
- The stop name.
- Each departure.

Within each departure, fields are separated by `^` characters. If you choose to filter which fields are returned using the `fields` request parameter, those fields will be omitted without returning a blank value. For example:

```text
http://localhost:8787/?stopId=3390FO07&format=string&maxResults=3&fields=line,routeNumber,expected
```

Returns:

```text
3390FO07|Forest Recreation Ground|yellow^69^1 min|^brown^15^2 mins|^yellow^68^4 mins
```

## How Does It Work?

### Overview

This project is implemented as a [Cloudflare Worker](https://workers.cloudflare.com/), code that runs and scales in a serverless execution environment across the Cloudflare network. Workers can be written in a few different languages, I chose JavaScript. All of the code lives in a single file, `index.js`.

Workers generally consist of an event listener and an event handler ([see docs](https://developers.cloudflare.com/workers/get-started/guide/)). The event listener listens for `fetch` events (such an event occurs when someone requests the URL that the worker is deployed at). It then calls the event handler whose job is to take the `Request` object for this call ([see docs](https://developers.cloudflare.com/workers/runtime-apis/request/[)) and build an appropriate `Response` object ([docs here](https://developers.cloudflare.com/workers/runtime-apis/response/)) then return it to the client.

All of the code to query the NCTX website, gather the bus departure data, filter and return it in the requested format happens in the `handleRequest` function.

### Getting the Page from the NCTX Website

The first thing that the code has to do is check that a stop ID was provided. It does this by looking for a URL parameter named `stopId` and responding with a bad request error if one isn't provided, or the request type was anything other than a `GET`:

```javascript
const url = new URL(request.url)
const stopId = url.searchParams.get('stopId')

if (request.method !== 'GET' || !stopId) {
  return new Response(BAD_REQUEST_TEXT, {
    status: BAD_REQUEST_CODE,
    headers: CORS_HEADERS,
  })
}
```

If a stop ID was provided, we'll get the source HTML for that stop's page from NCTX:

```javascript
const stopUrl = `https://nctx.co.uk/stops/${stopId}`
const stopPage = await fetch(stopUrl)
```

You can check out what a stop page looks like [here](https://www.nctx.co.uk/stops/3390FO07), which is the page for stop "3390FO07" (Forest Recreation Ground).

### Parsing Data from the Page Source and Storing It

The HTML page source has been fetched into a variable called `stopPage`, what we need to do now is parse through it and find the data for each departure from the stop. Cloudflare provides a [HTML Rewriter](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/) as part of the Workers API - it parses the HTML for us, firing listener functions whenever selector expressions that we are looking for are found.

From inspecting the HTML page source from NCTX, we can determine which selectors will match for each element containing a data item that we're interested in. For example, here let's find where a bus that's due to pass by the stop is headed to, which is contained in a paragraph with a CSS class names `single-visit__description`:

```javascript
const htmlRewriter = await new HTMLRewriter()
  .on('p.single-visit__description', {
    text(text) {
      if (text.text.length > 0) {
        currentDeparture.destination = text.text.trim()
      }
    },
  })
  // functions for other matches...
  .transform(stopPage) // run the rewriter
  .text()
```

When a match for such a paragraph tag is found, we provide a handler for [text chunks](https://developers.cloudflare.com/workers/runtime-apis/html-rewriter/#text-chunks) and store the text found, trimming any whitespace from it.

The code contains several functions that fire when different selectors are found. These each get a single piece of data about a bus departure and store it in an object named `currentDeparture`.

The last data item found for each departure is either the real time estimate of when the bus will arrive at the stop, or a timetable estimate for buses that don't have real time tracking, or which haven't started on the journey yet. When one of these items is found, the code pushes the `currentDeparture` object into an array named `departures`, and starts again with the next departure. In this way, we build up an array of objects describing upcoming departures from the stop.

### Data Cleanup / Formatting

Each of the functions that run when a selector match is found have to do some leel of cleanup or formatting on the data to make it more useful in an API response. The most common change is to trim whitespace off the start and end of strings, which is generally done like this:

```javascript
const trimmedText = text.text.trim()
```

Where `text` is a text chunk returned by the HTML rewriter and `text.text` is the string value found.

Some data is checked against lookup objects to get the value that goes into the API response. For example, there's no line name in the HTML, but we can work it out based on an HTML colour code in the source:

```javascript
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
...

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
```

Another data item that requires noteworthy formatting is the number of minutes until the bus is due to arrive at the stop. In the source HTML, this can have a number of formats. For buses with live tracking:

- "Due" - means the bus is due in 0 mins.
- "2 mins" - need to extract the 2 and turn it into an integer for the response.

These scenarios are handled here:

```javascript
.on('div.single-visit__time--expected', {
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

      currentDeparture.isRealTime = true

      departures.push(currentDeparture)
      currentDeparture = {}
    }
  },
})
```

For buses without live tracking, we also have to deal with times in 24hr format:

- "Due" - means the bus is due in 0 mins.
- "22:23" - 24 hour clock format for when a real time estimate isn't available. This has to be turned into the number of minutes between the present time, and the time in the HTML... which may be for early the following morning as the buses run beyond midnight.  This involves some annoying mental gymnastics with JavaScript dates and is handled like so:

```javascript
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

.on('div.single-visit__time--aimed', {
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
          const ukNow = new Date(new Intl.DateTimeFormat(INTL_DATE_TIME_FORMAT_LOCALE, INTL_DATE_TIME_FORMAT_OPTIONS).format(new Date()))
          const departureDate = new Date(new Intl.DateTimeFormat(INTL_DATE_TIME_FORMAT_LOCALE, INTL_DATE_TIME_FORMAT_OPTIONS).format(new Date()))

          // Zero these out for better comparisons at the minute level.
          ukNow.setSeconds(0)
          ukNow.setMilliseconds(0)
          departureDate.setSeconds(0)
          departureDate.setMilliseconds(0)

          const [ departureHours, departureMins ] = trimmedText.split(':')
          const departureHoursInt = parseInt(departureHours, 10)
          const departureMinsInt = parseInt(departureMins, 10)

          departureDate.setHours(departureHoursInt)
          departureDate.setMinutes(departureMinsInt)

          if (ukNow.getHours() > departureHoursInt) {
            // The departure is tomorrow e.g. it's now 23:00 and the departure is 00:20.
            departureDate.setDate(departureDate.getDate() + 1)
          }

          const millis = departureDate - ukNow
          const minsToDeparture = (millis/1000)/60

          currentDeparture.expectedMins = minsToDeparture
        } else {
          // This time is in the "59 mins" format.
          currentDeparture.expectedMins = parseInt(
            trimmedText.split(' ')[0],
            10
          )
        }
      }

      currentDeparture.isRealTime = false
      departures.push(currentDeparture)
      currentDeparture = {}
    }
  },
})
```

### Filtering the Response

As we saw earlier in this document, there's several ways that the response can be filtered using request parameters. For example, we may only need to return buses operating on a given line colour or only the first 5 results. As we saw, these filter parameters can be added together so we need to be sure to apply each one that was specified on the request before returning our response.

These filters are implemented as a series of code blocks, each of which checks for the presence of a request parameter then removes departure objects from the `departures` array that don't match the filter criteria.

The route number filter is an interesting example, as some routes have different variants that are still the same route number, but may not travel the entire length of the route or stop at all of the stops. These variants end in a letter - `X` for example often indicating "express". I decided that, for example, filtering for route `69` should also return route `69A`, `69C`, `69X` so had to implement some logic for that as follows:

```javascript
const NUMBER_CHARS_LOOKUP = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

// Filter by route if needed... route 69 includes 69A, 69X etc but not 169 or 690.
const routeToFilter = url.searchParams.get('routeNumber')
if (routeToFilter) {
  results.departures = results.departures.filter(departure => {
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
```

The other filters follow similar patterns - use the JavaScript array filter function to run logic against each members of `departures` to determine whether to keep it or not.

### Limiting which Data Fields are Returned

If the `fields` request parameter was provided on the request, we need to return only a specified subset of the data fields.

`fields` is expected to be a comma separated list of data field names, so we get those using `split`, then set the `results.departures` array to the result of mapping over its current value, returning departure objects that only contain the requested fields:

```javascript
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
```

### Formatting the Response and Returning it to the Caller

The code that returns the response to the caller first determines if a JSON or String response was requested...

For a JSON response (the default), we create a new `Response` object, returning formatted JSON and setting the `content-type` header appropriately:

```javascript
const responseFormat = url.searchParams.get('format')
if (!responseFormat || responseFormat === 'json') {
  return new Response(JSON.stringify(results, null, 2), {
    headers: {
      'content-type': 'application/json;charset=UTF-8',
      ...CORS_HEADERS,
    },
  })
}
```

For a String response (the value of the request parameter `format` is set to `string`), we need to output the stop ID and stop name first, separated by `|`, then output each departure's data with a `^` separating each field for that departure and `|` separating each departure. Note there's also some code to make sure we don't leave a trailing delimiter after the last field:

```javascript
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
```

### Cross Origin Resource Sharing (CORS)

I wanted the API to be callable from anywhere, including JavaScript embedded in web pages. In order to allow that, I had to enable [Cross Origin Resource Sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) or CORS. As we're only handling "simple" `GET` requests here, we don't need to worry about the CORS pre-flight `OPTIONS` request scenario. This means that enabling CORS is as simple as ensuring that the correct extra headers are returned with each response.

Here's the headers I'm sending back as I want to allow the API to be called from anywhere:

```javascript
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
}
```

And here's an example of how to add them to the response that the Cloudflare Worker sends back to the client:

```javascript
return new Response(JSON.stringify(results, null, 2), {
  headers: {
    'content-type': 'application/json;charset=UTF-8',
    ...CORS_HEADERS,
  },
})
```

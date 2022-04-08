# Nottingham City Transport Bus Departures API

TODO Picture

## Overview

TODO

## Running Locally

To run this locally, you'll need:

* [Git command line tools](https://git-scm.com/downloads) - to clone the project.
* [Node.js](https://nodejs.org/en/download/) - use the latest long term stable (LTS) version.
* Cloudflare Wrangler - a tool for developing and deploying Cloudflare Workers (requires a free [Cloudflare account](https://www.cloudflare.com/))
* A web browser, anything will do but I like [Google Chrome](https://www.google.com/chrome/).

First, get the code:

```bash
$ git clone https://github.com/simonprickett/nctx-stop-api.git
$ cd nctx-stop-api
```

Then, follow the Wrangler instructions to authenticate Wrangler with your Cloudflare account.  Now, you're ready to start a local copy of the worker:

```bash
$ wrangler dev
```

TODO output from the above...

## Deploying to Cloudflare Workers

When you're ready to publish the worker to the world and give it a public URL that's part of your Cloudflare account, use Wrangler:

```bash
$ wrangler publish
```

TODO output from the above...

## Usage

### Obtaining a Bus Stop ID

This API works  at the bus stop level, there's no endpoints to get a list of routes or stops.  To make it work you'll need a bus stop ID.  You can get one of these from the [Nottingham City Transport website](https://www.nctx.co.uk/) like so:

* Go to the Nottingham City Transport home page.
* Enter a location into the "Live Departures" search box (example locations: "Sherwood", "Gotham", "Victoria Centre"), or click "find your stop on the map".
* A map appears showing bus stops near your location - pick one and click on it.
* A pop up appears, click "Departures"
* You should now be looking at the live departure board for a stop.  The stop ID is the final part of the page URL, for example given the URL `https://www.nctx.co.uk/stops/3390J1`, the stop ID is `3390J1`.
* Make a note of your stop ID and use it in the examples below. 

### Requesting Departure Data for a Bus Stop

The following examples all use stop ID `3390FO07` ("Forest Recreation Ground"), and route numbers and line colours that pass through that stop.

TODO

### Filtering / Limiting Data Returned

TODO

### Specifying the Format for Data Returned

TODO

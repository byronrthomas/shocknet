# Client for ShockNet

## About
The client for ShockNet is written in Javascript. It can be built and run separately, for
development and extension purposes, but it is most convenient to use the built artefacts in
the python webserver of the main project.

## Non-developers
You will save yourself a lot of hassle by not touching this subfolder, return to the README in
the repo root folder and use the running instructions to just use pre-built Javascript.

## Developer-only instructions
If you wish to update the Javascript, you will need to have node and npm installed with
the correct versions (e.g. using a tool like `fnm` to manage node versions). Ensure you are
using the node-version listed in `.node-version` and then you can run:

* `npm install` to get all of the Javascript dependencies and dev dependencies installed.
* `npm run build` is used to build the Javascript and output bundles and HTML files to the `dist`
folder
* `npm start` is used to start the dev webserver which serves up the Javascript and will need
a running backend somewhere (normally a flask server running locally, see the main readme for
instructions)
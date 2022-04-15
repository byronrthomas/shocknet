#!/bin/bash
set -e

cd client
fnm use
echo Attempting to run webpack
npm run build
cd ..
echo Removing python static assets
rm -rf shocknet/static
cp -R client/dist shocknet/static
echo Done
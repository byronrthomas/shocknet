#!/bin/bash
set -e

echo Attempting to run webpack
npm run build
echo Removing python static assets
rm -rf ../shocknet/static
cp -R dist ../shocknet/static
echo Done
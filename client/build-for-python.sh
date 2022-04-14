#!/bin/bash
set -e

echo Attempting to run webpack
npm run build
echo Removing python static assets
rm -rf ../tgfinance2022/static
cp -R dist ../tgfinance2022/static
echo Done
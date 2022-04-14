#!/bin/bash
set -e

cd client
echo Attempting to run webpack
npm run build
cd ..
echo Removing python static assets
rm -rf tgfinance2022/static
cp -R client/dist tgfinance2022/static
echo Done
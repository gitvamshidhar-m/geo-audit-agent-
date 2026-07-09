#!/bin/sh
# Install Playwright and Chromium with all system dependencies
npx playwright install chromium --with-deps
# Install npm dependencies
npm install

# STOCKMOK — FIREBASE PROJECT FACTS

## Current project state

FIREBASE_PROJECT_CREATED = YES
FIREBASE_PROJECT_DISPLAY_NAME = Stockmok
FIREBASE_PROJECT_ID = stockmok

GOOGLE_CLOUD_PROJECT_ID = stockmok

BILLING_PLAN = Spark
# Spark / Blaze / NOT_CONFIGURED

BUDGET_ALERTS_CONFIGURED = NO
# No billing upgrade/budget-alert configuration has been performed yet.
# Before production Cloud Functions deployment, evaluate upgrade to Blaze
# and configure billing alerts.
# Budget alerts are notifications only. They do not cap or prevent spending.

## Firestore

FIRESTORE_CREATED = YES
FIRESTORE_EDITION = Standard
# Standard / unknown

FIRESTORE_DATABASE_ID = (default)
# normally (default)

FIRESTORE_LOCATION = asia-southeast1 (Singapore)
# Recommended/intended location: asia-southeast1 (Singapore).
# Verify the actual immutable Firestore database location in Firebase Console.
# Do NOT guess or attempt to recreate/migrate the database during this architecture run.

## Authentication

EMAIL_PASSWORD_AUTH = ENABLED
GOOGLE_AUTH = ENABLED

AUTHORIZED_DOMAINS = localhost, stockmok.firebaseapp.com, stockmok.web.app
# Verified read-only through the authenticated Firebase CLI identity on 2026-08-25.
# stockmok.com has not yet been connected or authorized.

## Cloud Functions

FUNCTIONS_ALREADY_INITIALIZED = LOCAL IMPLEMENTATION COMPLETE / PRODUCTION NOT DEPLOYED
FUNCTIONS_REGION = asia-southeast1
CLOUD_FUNCTIONS_API = DISABLED
# Production deployment remains an owner-controlled action after Blaze readiness.

FUNCTIONS_GENERATION = 2nd gen
# 2nd gen / undecided

NODE_RUNTIME = 22
# 20 / 22 / undecided

## Hosting

HOSTING_INITIALIZED = LOCAL CONFIG READY / PRODUCTION NOT DEPLOYED
# The existing default site is the owner-approved production target.
# No Hosting release was created or changed during RC2 source repair.

HOSTING_SITE_ID = stockmok
HOSTING_PRIMARY_URL = https://stockmok.web.app
HOSTING_SECONDARY_SITE_ID = stockmokweb
HOSTING_SECONDARY_URL = https://stockmokweb.web.app
# The secondary site is retained unchanged and is not an RC2 deployment target.

CUSTOM_DOMAIN_STATUS = stockmok.com purchased; DNS/custom-domain connection not yet configured
# stockmok.com purchased / not purchased / DNS not connected / etc.

CUSTOM_DOMAIN =
stockmok.com

WWW_DOMAIN_PLAN = redirect www.stockmok.com → stockmok.com
# redirect www → apex / undecided

## Storage

CLOUD_STORAGE_REQUIRED_FOR_RELEASE_AB =
NO

CLOUD_STORAGE_ALREADY_CREATED = NOT_VERIFIED / NOT INTENTIONALLY PROVISIONED
# A storageBucket value exists in the Firebase Web configuration,
# but Cloud Storage has not been intentionally configured as part of
# Release A + B-Lite and is not required by the frozen scope.

## App Check

APP_CHECK_CONFIGURED = NO
APP_CHECK_ENFORCEMENT = disabled
# disabled / observe / enforced / undecided
# Recommended to configure only after normal Auth/Firestore/Functions
# integration is working and tested.

## Local development

FIREBASE_CLI_VERSION = 15.27.0
NODE_VERSION = 22.23.2
NPM_VERSION = 10.9.8

EMULATOR_SUITE_CONFIGURED = YES

## Production environments

ENVIRONMENT_PLAN = local Firebase Emulator Suite + one production Firebase project
# local emulators + production Firebase / other

# Current plan:
# - Development/testing: Firebase Emulator Suite
# - Production: Firebase project "stockmok"
# - Do not create separate cloud dev/staging projects for the current
#   coursework implementation unless later justified.

## Important notes

- Firebase Web App is already registered.
- Firebase Web App nickname: Stockmok Web.
- Firebase Hosting default site exists as `stockmok.web.app` and is the selected production target.
- The secondary `stockmokweb.web.app` site remains present and unchanged.
- Email/Password authentication is enabled.
- Google authentication is enabled.
- Email-link/passwordless authentication is disabled.
- Production Firestore was created using the conservative/production-security approach rather than intentionally exposing an open test database.
- Do not manually create Firestore collections from Firebase Console.
- Do not manually seed production data.
- Do not change frozen Stockmok business rules.
- Do not provision services during the database-architecture run.
- Do not deploy Firestore Rules, Functions, Hosting or indexes during the database-architecture run.
- Do not initialize Firebase CLI or Emulator Suite during the database-architecture run.
- Database architecture documentation must be completed and pass the database-readiness gate before physical Firebase implementation begins.
- Unknown fields above must be resolved/recommended explicitly rather than guessed.

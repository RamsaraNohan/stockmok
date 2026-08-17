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

AUTHORIZED_DOMAINS = NOT_VERIFIED
# Firebase-generated domains are expected to exist from project setup,
# but the exact authorized-domain list has not been recorded.
# stockmok.com has not yet been confirmed as an authorized Auth domain.

## Cloud Functions

FUNCTIONS_ALREADY_INITIALIZED = NO
FUNCTIONS_REGION = UNDECIDED
# Recommended: co-locate with Firestore.
# If Firestore is confirmed as asia-southeast1, recommend asia-southeast1.

FUNCTIONS_GENERATION = 2nd gen (PLANNED / NOT INITIALIZED)
# 2nd gen / undecided

NODE_RUNTIME = undecided
# 20 / 22 / undecided
# Resolve against the current Firebase-supported runtime before implementation.

## Hosting

HOSTING_INITIALIZED = PARTIAL
# Firebase Hosting site has been created in the Firebase project.
# Local Firebase CLI Hosting initialization has NOT yet been performed.

HOSTING_SITE_ID = stockmokweb

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

FIREBASE_CLI_VERSION = NOT_VERIFIED
NODE_VERSION = NOT_VERIFIED
NPM_VERSION = NOT_VERIFIED

EMULATOR_SUITE_CONFIGURED = NO

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
- Firebase Hosting site already exists as:
  stockmokweb.web.app
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
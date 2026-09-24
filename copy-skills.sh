#!/bin/bash

SKILLS_DIR="$(pwd)"
DEST_SKILLS="/.claude/skills"
AGENT_SKILLS="/.agent/skills"
SKILLS=(
  do-urd
  do-test
  do-e2e
  do-chrome
  do-bugs
  run-graphify
)

DESTINATIONS=(
  "../VietBank/Utop.VietBank.CRM"
  "../VietBank/Utop.VietBank.CRM.1"
  # "../VietBank/Utop.VietBank.CRM.2"
)

for DEST in "${DESTINATIONS[@]}"; do
  mkdir -p $DEST
  EXCLUDE_FILE="$DEST/.git/info/exclude"

tee $DEST/apps/angular/e2e-playwright/.env > /dev/null <<EOF
PW_TENANT=bank
PW_USER=ho
PW_PASSWORD=1qaZ2wsX@
PW_CLIENT_ID=AngularDev
PW_HOST_ADMIN_USER=admin
PW_HOST_ADMIN_PASSWORD=1qaZ2wsX@
EOF

tee $DEST/.env > /dev/null <<EOF
WH_ID=
WH_TOKEN=
QA_DB_PASSWORD=Vb#Crm#2026!
QA_DB_SERVER=20.6.73.20
QA_DB_NAME=vbb-crm-qa-qc
QA_DB_USER=u_saas_service
EOF

  for SKILL in "${SKILLS[@]}"; do
    echo "Copying $SKILLS_DIR/$SKILL -> $DEST$DEST_SKILLS"
    mkdir -p $DEST$DEST_SKILLS
    cp -fr "$SKILLS_DIR/$SKILL" "$DEST$DEST_SKILLS"
    PATTERN="**/skills/$SKILL"
    if ! grep -qF "$PATTERN" "$EXCLUDE_FILE" 2>/dev/null; then
      echo "$PATTERN" >> "$EXCLUDE_FILE"
      echo "Added $PATTERN to $EXCLUDE_FILE"
    fi
  done
done

echo
echo "Done!"

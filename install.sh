#!/bin/bash

# Pflegebox Konfigurator - Installationsskript
# Dieses Skript installiert die Anwendung auf einem Linux-Server

set -e

echo "=========================================="
echo "  Pflegebox Konfigurator Installation"
echo "=========================================="

# Prüfen ob als root ausgeführt
if [ "$EUID" -ne 0 ]; then 
    echo "Bitte als root ausführen (sudo ./install.sh)"
    exit 1
fi

# Installationsverzeichnis
INSTALL_DIR="/opt/pflegebox"
SERVICE_USER="pflegebox"

echo ""
echo "[1/6] System-Pakete installieren..."
apt-get update -qq
apt-get install -y -qq python3 python3-pip python3-venv

echo ""
echo "[2/6] Benutzer erstellen..."
if ! id "$SERVICE_USER" &>/dev/null; then
    useradd -r -s /bin/false $SERVICE_USER
    echo "Benutzer '$SERVICE_USER' erstellt."
else
    echo "Benutzer '$SERVICE_USER' existiert bereits."
fi

echo ""
echo "[3/6] Anwendung kopieren..."
mkdir -p $INSTALL_DIR
cp -r backend/* $INSTALL_DIR/
cp -r frontend/build $INSTALL_DIR/static
chown -R $SERVICE_USER:$SERVICE_USER $INSTALL_DIR

echo ""
echo "[4/6] Python-Umgebung einrichten..."
cd $INSTALL_DIR
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip -q
pip install -r requirements.txt -q
deactivate

echo ""
echo "[5/6] Systemd-Service installieren..."
cp systemd/pflegebox.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable pflegebox

echo ""
echo "[6/6] Service starten..."
systemctl start pflegebox

echo ""
echo "=========================================="
echo "  Installation abgeschlossen!"
echo "=========================================="
echo ""
echo "Die Anwendung läuft jetzt auf Port 8001"
echo ""
echo "Befehle:"
echo "  Status:    systemctl status pflegebox"
echo "  Stoppen:   systemctl stop pflegebox"
echo "  Starten:   systemctl start pflegebox"
echo "  Logs:      journalctl -u pflegebox -f"
echo ""

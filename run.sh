#!/bin/bash


cd "server"

if [ ! -d "node_modules" ]; then
    echo "Node_modules introuvables dans le serveur. Installation des dépendances..."
    npm install
fi


cd "../gitjournal-vue"

if [ ! -d "node_modules" ]; then
    echo "Node_modules introuvables. Installation des dépendances..."
    npm install
fi

echo "Lancement de GitJournal the best"

npm run electron:dev
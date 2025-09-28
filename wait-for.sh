#!/bin/sh
# wait-for.sh
# Uso: ./wait-for.sh host1:port1 host2:port2 ... -- comando a ejecutar

set -e

# Separar los argumentos de hosts y del comando final
while [ "$#" -gt 0 ]; do
  case "$1" in
    --)
      shift
      CMD="$@"
      break
      ;;
    *)
      HOST_PORTS="$HOST_PORTS $1"
      shift
      ;;
  esac
done

# Esperar a que cada host:port esté disponible
for HOST_PORT in $HOST_PORTS; do
  HOST=$(echo $HOST_PORT | cut -d: -f1)
  PORT=$(echo $HOST_PORT | cut -d: -f2)
  echo "Waiting for $HOST:$PORT..."
  while ! nc -z $HOST $PORT; do
    sleep 1
  done
done

# Ejecutar el comando final
exec $CMD

FROM ubuntu:16.10
# for raspberryPi
#FROM hypriot/rpi-node

RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y apt-utils
RUN DEBIAN_FRONTEND=noninteractive apt-get -qq -y install bluetooth
RUN DEBIAN_FRONTEND=noninteractive apt-get -qq -y install bluez
#for DEBUG
#RUN DEBIAN_FRONTEND=noninteractive apt-get -qq -y install bluez-hcidump
RUN DEBIAN_FRONTEND=noninteractive apt-get -qq -y install libbluetooth-dev
RUN DEBIAN_FRONTEND=noninteractive apt-get -qq -y install libudev-dev
RUN DEBIAN_FRONTEND=noninteractive apt-get -qq -y install nodejs
RUN ln -s /usr/bin/nodejs /usr/bin/node
RUN DEBIAN_FRONTEND=noninteractive apt-get -qq -y install npm

COPY . /src
RUN cd /src; npm install

CMD ["node", "/src/index.js"]
#for DEBUG
#CMD ["/bin/sh", "/src/cmd.sh"]

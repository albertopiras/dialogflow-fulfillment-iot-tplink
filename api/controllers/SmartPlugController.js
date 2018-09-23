var _ = require('lodash');
const { WebhookClient, Payload, Card, Suggestion, Text } = require('dialogflow-fulfillment');
const { login } = require("tplink-cloud-api");
const https = require('https');

var tplink, deviceList;

var mainInterval;

/**Checks the TpLink device connection
 * @return an object with result:boolean and err_message:string
 */
async function checkTplinkDevices(response) {
  let tplinkLogin = false;
  let tplinkDevices = false;

  if (!tplink) {
    try {
      tplink = await login("albe45313@gmail.com", "bellazio91");
      tplinkLogin = true;
    } catch (err) {
      console.log('ERRORE tplink ' + err);
      response.message = `Error - TpLink credentials.`;
    }
  }

  if (tplinkLogin && !deviceList) {
    try {
      deviceList = await tplink.getDeviceList();
      tplinkDevices = true;
    } catch (err) {
      console.log('ERRORE tplink' + err);
      response.message = response.message.concat(`Error - TpLink device list.`);
    }
  }

  // if  tplink && deviceList are already instantiated return true
  return tplink && deviceList ? true : tplinkLogin && tplinkDevices;

}


async function doAction(action, deviceId, response) {
  try {
    if (mainInterval) {
      console.log(' ---- Clear Interval ----');
      clearInterval(mainInterval);
    }
    if (action === "on") {
      console.log('ON ' + action);
      await tplink.getHS100(deviceId).powerOn();
    } else if (action === "off") {
      console.log('OFF ' + action);
      await tplink.getHS100(deviceId).powerOff();
    }
    response.message = `Action successfully performed`;
  } catch (err) {
    console.log('ERRORE tplink' + err);
    response.message = `Error performing action ${action} on device ${deviceId}`;
  }

}

module.exports = {

  smarthome: async function (request, response) {

    const agent = new WebhookClient({ request, response });

    var userResponse = {
      message: ""
    }

    async function DeviceActivation(agent) {
      console.log('Intent: DeviceActivation --- \n');

      var tpLinkConnected = await checkTplinkDevices(userResponse);
      if (!tpLinkConnected) {
        agent.add(userResponse.message);
        return
      }

      let action = agent.parameters.action;
      let deviceId = agent.parameters.deviceId;

      await doAction(action, deviceId, userResponse);
      agent.add(userResponse.message);

    }


    async function DeviceProgramming(agent) {
      console.log('Intent: DeviceProgramming --- \n');

      var tpLinkConnected = await checkTplinkDevices(userResponse);
      if (!tpLinkConnected) {
        agent.add(userResponse.message);
        return
      }

      const action = agent.parameters.action;
      const deviceId = agent.parameters.deviceId;
      const temperature = parseInt(agent.parameters.temperature.amount);
      const city = agent.parameters.city;
      const range = agent.parameters.range;


      // await requestTemperatureByCity(city).then(async function (res) {
      //   if (res.main && res.main.temp) {
      //     const realTemp = parseInt(res.main.temp);

      //     console.log('weather temp res ' + realTemp);

      //     if (range === "under") {
      //       if (realTemp < temperature) {
      //         await doAction(action, deviceId, userResponse);
      //         return;
      //       }


      //       userResponse.message = `Temperature in ${city} is now under ${temperature} degrees.`;
      //       userResponse.message = `Timer activated.`;


      //     } else if (range === "above") {
      //       if (realTemp >= temperature) {
      //         await doAction(action, deviceId, userResponse);
      //         return;
      //       }


      //       userResponse.message = `Temperature in ${city} is now under ${temperature} degrees.`;
      //       userResponse.message = `Timer activated.`;

      //     }

      //     return;
      //   } throw "weather call error";

      // }).catch(function (err) {
      //   userResponse.message = `Error retrieving current city temperature - try again or permorm simple action like: start device 'your device name'`;
      // });

      await doActionWithTemperature(action, deviceId, city, temperature, range, userResponse);

      agent.add(userResponse.message);

    }

    //Action Mapping
    const actionMap = new Map();
    actionMap.set('DeviceActivation', DeviceActivation);
    actionMap.set('DeviceProgramming', DeviceProgramming);
    agent.handleRequest(actionMap);

  }

};


function doActionWithTemperature(action, deviceId, city, temperature, range, userResponse) {

  return requestTemperatureByCity(city).then(async (res) =>{
    if (res.main && res.main.temp) {
      const realTemp = parseInt(res.main.temp);

      console.log('weather temp response ' + realTemp + 'and comparison temp is ' + temperature);

      if (range === "under") {
        if (realTemp < temperature) {
          await doAction(action, deviceId, userResponse);
          return;
        }

        if (!mainInterval) {
          userResponse.message = `Temperature in ${city} is now under ${temperature} degrees.`;
          userResponse.message = `Timer activated.`;
          mainInterval = setInterval(() => {
            doActionWithTemperature(... arguments);
          }, 1000*60*5);

        }

      } else if (range === "above") {
        if (realTemp > temperature) {
          await doAction(action, deviceId, userResponse);
          return;
        }

        if (!mainInterval) {
          userResponse.message = `Temperature in ${city} is now under ${temperature} degrees.`;
          userResponse.message = `Timer activated.`;
          mainInterval = setInterval(() => {

            doActionWithTemperature(... arguments);
          }, 1000*60*5);
        }

      }

      return;
    } throw "weather call error : "+  JSON.stringify(res);

  }).catch(function (err) {
    console.log("Error " + err);
    userResponse.message = `Error retrieving current city temperature - try again or perform simple action like: start device 'your device name'`;
  });
}


function requestTemperatureByCity(cityName) {
  console.log('requestTemperatureByCity ' + cityName);
  var url = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&units=metric&appid=c519f8f1270e6208a000fd23fd73460c`
  console.log(cityName);

  return new Promise(function (resolve, reject) {
    https.get(url, (resp) => {
      let data = '';
      resp.on('data', (chunk) => {
        data += chunk;
      });
      resp.on('end', (res) => {
        resolve(JSON.parse(data));
      });
    }).on("error", (err) => {
      console.log("Weather Error: " + err.message);
      reject("Weather Error: " + err.message)
    });
  });


}
const _ = require('lodash');
const { WebhookClient, Payload, Card, Suggestion, Text } = require('dialogflow-fulfillment');
const { login } = require("tplink-cloud-api");
const https = require('https');
const conf = sails.config;

var tplink, deviceList;
var mainTimeout;

module.exports = {

  smarthome: async function (request, response) {

    const agent = new WebhookClient({ request, response });

    var userResponse = {
      message: ""
    };

    async function DeviceActivation(agent) {
      console.log('Intent: DeviceActivation --- \n');

      var tpLinkConnected = await checkTplinkDevices(userResponse);
      if (!tpLinkConnected) {
        agent.add(userResponse.message);
        return;
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
        return;
      }

      const action = agent.parameters.action;
      const deviceId = agent.parameters.deviceId;
      const temperature = parseInt(agent.parameters.temperature.amount);
      const city = agent.parameters.city;
      const range = agent.parameters.range;

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


/** 
 * Checks the TpLink device connection
 * @param  response 
*/
async function checkTplinkDevices(response) {
  let tplinkLogin = false;
  let tplinkDevices = false;

  if (!tplink) {
    try {
      tplink = await login(conf.custom.tp_link_credentials.username, conf.custom.tp_link_credentials.password);
      tplinkLogin = true;
    } catch (err) {
      console.log('Error - tplink login: ' + err);
      response.message = `Error - TpLink credentials.`;
    }
  }

  if (tplinkLogin && !deviceList) {
    try {
      deviceList = await tplink.getDeviceList();
      tplinkDevices = true;
    } catch (err) {
      console.log('Error - tplink devicelist: ' + err);
      response.message = response.message.concat(`Error - TpLink device list.`);
    }
  }

  // if  tplink && deviceList are already instantiated return true
  return tplink && deviceList ? true : tplinkLogin && tplinkDevices;

}

/**
 * Executes a specific action on a device
 * @param  action 
 * @param  deviceId 
 * @param  response 
 */
async function doAction(action, deviceId, response) {
  try {
    if (mainTimeout) {
      console.log(' ---- Clear Timeout ----');
      clearTimeout(mainTimeout);
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
    console.log('Error - tplink action' + err);
    response.message = `Error performing action ${action} on device ${deviceId}`;
  }

}

/** 
 * It Programs an action with temperature control
 */
function prepareTimeout(action, deviceId, city, temperature, range, userResponse, currentTemp) {
  if (mainTimeout) {
    clearTimeout(mainTimeout);
  }
  userResponse.message = `The action will be performed when temperature in ${city} will be ${range} ${temperature} degrees (now it is ${currentTemp}). \ Timer activated`;
  mainTimeout = setTimeout(() => {
    doActionWithTemperature(action, deviceId, city, temperature, range, userResponse);
  }, conf.custom.interval_value);

}

/**
 *  It Performs an action if conditions are satisfied
 *  Conditions: if the temperature in a specific city sotisfies the condition 
 */
function doActionWithTemperature(action, deviceId, city, temperature, range, userResponse) {
  console.log(arguments);

  return requestTemperatureByCity(city).then(async (res) => {
    if (res.main && res.main.temp) {
      const realTemp = parseInt(res.main.temp);
      console.log('weather temp response is ' + realTemp + ' and comparison temp is ' + temperature);

      if (range === "under") {
        if (realTemp < temperature) {
          await doAction(action, deviceId, userResponse);
          return;
        }
        prepareTimeout(...arguments, realTemp);

      } else if (range === "above") {
        if (realTemp > temperature) {
          await doAction(action, deviceId, userResponse);
          return;
        }
        prepareTimeout(...arguments, realTemp);
      }
      console.log(userResponse.message);
      return;
    } throw "weather call error : " + JSON.stringify(res);

  }).catch(function (err) {
    console.log("Error " + err);
    userResponse.message = `Error retrieving current city temperature - try again or perform simple action like: start device 'your device name'`;
  });
}

/**
 * It retrieves the temperature into the specified city
 * @param cityName 
 * @returns Promise
 */
function requestTemperatureByCity(cityName) {
  console.log('requestTemperatureByCity ' + cityName);
  var url = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&units=metric&appid=${conf.custom.openweather_api_key}`;
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
      reject("Weather Error: " + err.message);
    });
  });

}

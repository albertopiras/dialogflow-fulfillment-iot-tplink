# Google Dialogflow fulfillment webhook for IoT Tplink devices


This webhook service is built with Google [dialogflow-fulfillment] library, [SailsJS], an iot TP-Link plug and openweather APIs.

This webhook allows you to control your "space heater" or "cooling fan" at your home, using an Iot Plug device (tp-link HS100)

There are basically two kinds of interactions available:

- Direct control **start/stop** the **device**
-  Program the **start/stop** of a **device** if the **temperature** in the specified **city** is **under/above** a specific **value**.
     
Usage example:

- **Start** the **warming system**.
**Stop** the **cooling fan**
- **Start** the **space heather** if the temperature in **Berlin** is **below** **10 degrees**.


In this last case, if the condition is not valid, the system will start a control that checks the temperature every 5 minutes. When the conditon is sotisfied, it will execute the action. 


## Prerequisites
* Google Account
* TP-Link HS100 & TP-Link account
* openweather API key
    
## Setup

 1)
    * Buy a tp-link HS100 plug  :D
    * Set up the plug with the official application "KASA", and name your plug "myspaceheater" for the warming system control, or "mycoolingfan" for the cooling system control.

2)
    * Sign up for or sign into Dialogflow and create a agent
    * Go to your agent's settings and Restore from zip using the dialogflow-agent.zip in this directory (Note: this will overwrite your existing agent)
    * Open the file config/custom.js of this project.
        set the api key for openweater api
        set your user&pwd of your tp-link account
    * Deploy the SailsJS app with a provider like heroku.
    * Then go to fulfillment and insert the following Webhook URL: `https://yourapp.herokuapp.com/api/smarthome`
    * now try the app with an input like "Start the space heater".

## Test it locally - & how to Boost your development speed

run SailsJS with

    $ npm install
    $ node app.js

Your service will be available on http://localhost:1337

the webhook is available at the URI path `/api/smarthome`

BUT 

Due the fact your webhook must be obviously hosted on a public address, you cannot use localhost, you shall instead use a public instance.
So you should redeploy your service each time you do a change, if you want save time you can use the continuous integration with a platform like [heroku].
But you spend few second to commit every changes :)

So why don't create a temp link public address with the HTTP tunnelling with [ngrok]? 
open another terminal and intall & execute ngrok

    $ npm install ngrok -g
    $ ngrok http 1337

(the port is the same of the SailsJS process )

You will obtain an univocal address like "http://code_alphanumeric.ngrok.io" that will point to your local server instance, this will save you a lot of time.

Copy the nkrok address (http://code_alphanumeric.ngrok.io/api/smarthome) and use it in your dialogflow Fulfillment/Webhook section.

Another suggestion is tu use nodemon to run your sailsJS app, so at each change you will have your  app automatically redeployed,

so 

    $ npm install -g nodemon
    $ nodemon app.js
    
NodeJS server will be up on http://localhost:1337 exposing your SailsJS app
 
you have done, you can test it locally.

### Use your own agent with your Google Assistant or Google Home  ❤	

You can try your app into your device **if** you are **connected with the same Google account**.

As you probably already know you have to enable Web & App Activity, Device Information, Voice & Audio Activity in the [Activity controls page].

Then you also have to be sure that the language of your agent is the same used by your Google assistant.

And BUMM! Now you can try your app on your device ❤	

## License

MIT

[SailsJS]: <https://sailsjs.com>
[heroku]:<https://www.heroku.com>
[ngrok]: <https://ngrok.com/>
[dialogflow-fulfillment]: <https://github.com/dialogflow/dialogflow-fulfillment-nodejs>
[Activity controls page]:
<https://myaccount.google.com/u/1/activitycontrols>




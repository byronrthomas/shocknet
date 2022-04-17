## Other TODOs
* Tidy up any python / JS that may now be defunct
* Try and avoid a new user needing to make a secret
* Add some licensing attribution onto page
* Stick a tigergaph attrib on page
* Instructions has to include the query install step (or start from a starter that would have stuff - although then we get data too :( )


## Troubleshooting
See an error like ("Please run 'gadmin config set RESTPP.Factory.EnableAuth true' to enable this endpoint.", 'REST-1000'). This can mean that you're not running against TG cloud but instead against a locally installed TG Enterprise instance which doesn't have the same security setup. In order to make compatible you need to take the following steps to reconfigure Tigergraph.

On the host running Tigergraph Enterprise run the following:
`gadmin config set RESTPP.Factory.EnableAuth true`
`gadmin config apply`
Need to do `gadmin stop all` followed by `gadmin start all`

## About

TODO

## Usage

TODO

## Licenses & attribution

PROBABLY DOESN'T?
This project includes data sets from [Harvard Business School Behavioural Finance & Financial Stability](https://www.hbs.edu/behavioral-finance-and-financial-stability/data/Pages/global.aspx).

* Ensure check licences from any other libs - can massively tidy up python deps


# ShockNet
**Contributers and Contact Information: Byron Thomas (refer to devPost for contact details)**

**Problem Statement addressed (or explain your own): Graph For Better Finance**

**Description**: 

Demo video: ShockNet in action, how it solves the problem statement **TODO-LINK**

How it works video: [ShockNet's dataset, use of graph technology, and software stack (4mins)](https://youtu.be/00j4S_U0LsQ)


Explain what your project is trying to accomplish and how you utilized graph technology to achieve those goals. 
Describe how your submission is relevant to the problem statement and why it is impactful to the world. Remember to link your submission video here. 

Tell us how your entry was the most...					

- Impactful in solving a real world problem 
- Innovative use case of graph
- Ambitious and complex graph
- Applicable graph solution 

Other additions: 

 - **Data**: Give context for the dataset used and give full access to judges if publicly available or metadata otherwise. 
 - **Technology Stack**: Describe technologies and programming languages used. 
 - **Visuals**: Feel free to include other images or videos to better demonstrate your work.
 - Link websites or applications if needed to demonstrate your work. 

## Ways to run ShockNet
ShockNet can be run locally in one of several modes, in decreasing levels of convenience, but increasing levels of control
 - **Recommended:** run it with docker, you can pull down a prebuilt image and just run against a Tigergraph cloud instance
 - Back-end developers: run it locally using python 3.7
 - Front-end developers: run it locally using python 3.7 and node (Not recommended unless you really want to edit Javascript, this takes a fair bit of setup)

## Dependencies

Based on the method you choose to run with, the dependencies vary:
 - You always need an empty instance of Tigergraph cloud
 - If running the recommended way, you will need docker
 - If running as a developer, you will need python 3.7 or higher, and to run the front-end with freshly built assets, you will need to have node.js 16

The installation instructions below describe how to install the code dependencies once you have the above.

## Installation

You will need the basic tools described in the dependencies section, and an empty Tigergraph cloud instance. Then follow instructions based on which kind of installation you would like - it is highly recommended you use the docker or python methods only, this saves installing a lot of tools that are only necessary for those who want to change the code.

**IMPORTANT** Ensure Tigergraph is running before you run any shocknet commands or it
may hang indefinitely waiting for a connection.

### Installing & running using docker - recommended

Assuming you have docker on your system, the steps are as follows:
1. Create a directory where you like to run from, e.g. `mkdir shocknet`
2. Download the `.env.template` file in this repo into that directory
3. Rename it to be `.env`, i.e. `mv .env.template .env`
4. Edit the `.env` file to update the HOSTNAME, PASSWORD and USERNAME variables to the values needed to connect to your Tigergraph cloud instance

Run ShockNet to initialise the graph database for you, by running this from the same directory as your `.env` file:

`docker run -it -v $(pwd)/.env:/usr/src/app/.env --rm --name shocknet byronthomas712/shocknet:latest --initialise`

This will create the schema, by using the credentials from the `.env` file, and write all of the data into the
graph. It will also request a secret for accessing the database and write it back to the `.env` file.

Once this finishes, you will need to use Tigergraph GraphStudio to install queries - see instructions below [Installing queries in GraphStudio](#installing-queries-in-graphstudio), and then return here.

Once ShockNet has initialised, and you have installed the queries manually, then you can launch ShockNet, running in the same directory:

`docker run -it -p 127.0.0.1:9000:5000 -v $(pwd)/.env:/usr/src/app/.env --rm --name shocknet byronthomas712/shocknet:latest`

This will launch with the webserver running inside the container, available at port 9000, so to launch the
app, you just need to open your browser to http://127.0.0.1:9000 

### Installing & running - using Python

Assuming that you have python version 3.7 or higher and pip available locally (I suggest you use a tool like [pyenv](https://github.com/pyenv/pyenv) if you need to manage multiple python versions and dependency environments), you should do the following

1. Clone this repo
2. In the root folder that you cloned, copy the `.env.template` file to be `.env`, i.e. `cp .env.template .env`
3. Edit the `.env` file to update the HOSTNAME, PASSWORD and USERNAME variables to the values needed to connect to your Tigergraph cloud instance
4. Install the python dependencies locally using `pip install -r requirements.txt`

**NOTE**: the below commands assume your command to launch python >= 3.7 is `python` - depending on your setup, you might need to replace `python` with `python3` in the commands below.

Then you can run ShockNet to initialise the graph DB for you, from the root folder of this project run:

`python -m shocknet.start --initialise`

This will create the schema, by using the credentials from the `.env` file, and write all of the data into the
graph. It will also request a secret for accessing the database and write it back to the `.env` file.

Once this finishes, you will need to use Tigergraph GraphStudio to install queries - see instructions below [Installing queries in GraphStudio](#installing-queries-in-graphstudio), and then return here.

Once ShockNet has initialised, and you have installed the queries manually, then you can launch ShockNet, from the same directory:

`python -m shocknet.start`

This will launch with the webserver running locally, available at port 5000, so to launch the
app, you just need to open your browser to http://127.0.0.1:5000

### Installing and running with no pre-built assets (Developer-only not recommended)
Follow the instructions above for installing using python, but then refer to the [client readme](client/Readme.md) to follow
the instructions to get the Javascript dependencies installed locally and everything running in a dev server.

### Installing queries in GraphStudio

As part of the initialisation process, ShockNet creates two GSQL queries in GraphStudio, which need a manual
install step (it uses interpreted queries for several other use cases, but these two queries were not possible to run interpreted).

See below screenshots of GraphStudio to show how to proceed:
1. Select the correct graph (shocknet_economic_links)
2. Enter the "Write Queries" page
3. Click the "Install all" button
4. Wait for optimisation to finish (a few minutes normally)

![Write queries page of GraphStudio](docs/images/graph-studio-install-queries.png)

After the process has finished the icons for the two queries should look like this:

![GraphStudio after query installation](docs/images/graph-studio-after-queries-installed.png)

### Troubleshooting

If you see any issues with starting shocknet - either it hangs indefinitely or gives an error like `local variable 'res' referenced before assignment` - double-check your .env file is present in the current directory, the credentials and hostname are correct, and check that your Tigergraph instance is up and running.

If you get clashes with other graphs in the same instance, then you may have to drop them, you can pass the `--drop-all-schema` args to the initialise process to do this. Finally, if you have any issues with the secret, you can always manually create one in GraphStudio Admin page, and add it to the `.env` file either adding or replacing a line starting `SECRET=`.

## Known Issues and Future Improvements

The biggest limitation is the lack of any notion of demand and elasticities which 
reduces the usefulness of the results. I have some plans to introduce a fairly simple extension
to the model to help with this, but I unfortunately didn't have time to complete it within
the hackathon period.

Another angle to investigate would be updating the data used in the model and/or finding 
alternative sources that could enrich what we have.

## Reflections

Review the steps you took to create this project and the resources you were provided. Feel free to indiciate room for improvement and general reflections.

## References

Please give credit to other projects, videos, talks, people, and other sources that have inspired and influenced your project. 

### GTAP 8 Data Base
Narayanan, G., Badri, Angel Aguiar and Robert McDougall, Eds. 2012. Global Trade, Assistance, and Production: The GTAP 8 Data Base, Center for Global Trade Analysis, Purdue University

I extracted this data using the steps documented [here](./docs/data-extraction.md)


## Developing ShockNet

### Package for Docker
In order to build the JS assets for docker, and tag a new docker image run from the root:

```
BUILD_FOR_DOCKER=1 ./build-client.sh && docker build -t shocknet:0.5.6 .
```

Do not check in the updated JS assets.

### Package for Python
In order to simply build for serving from python running locally

```
./build-client.sh
```

This will place the JS assets in the python static assets folder - you should check these in.
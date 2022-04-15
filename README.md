## Other TODOs
* Tidy up any python / JS that may now be defunct
* Try and avoid a new user needing to make a secret
* Add some licensing attribution onto page
* Stick a tigergaph attrib on page
* Instructions has to include the query install step (or start from a starter that would have stuff - although then we get data too :( )

## Limitations of model
* Doesn't explicitly call out the obvious shock, e.g. "if no petrol products from gulf, then no petrol products on sale for public" - it's more focused on how shocks create other shocks.

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
 - If running as a developer, you will need python 3.7, and to run the front-end with freshly built assets, you will need to have node.js 16

The installation instructions below describe how to install the code dependencies once you have the above.

## Installation

Assuming you have an empty Tigergraph cloud instance, then you can proceed as follows

### Installing & running using docker - recommended

Assuming you have docker on your system, the steps are as follows:
1. Create a directory where you like to run from, e.g. `mkdir shocknet`
2. Download the `.env.template` file in this repo into that directory
3. Rename it to be `.env`, i.e. `mv .env.template .env`
4. Edit the `.env` file to update the HOSTNAME, PASSWORD and USERNAME variables to connect to your Tigergraph cloud instance

**YOU CAN LEAVE THE SECRET BLANK**

Then in the same directory, set ShockNet to initialise the graph database for you:
`docker run -it -v $(pwd)/.env:/usr/src/app/.env --rm --name shocknet byronthomas712/shocknet:latest --initialise`

This will create the schema, by using the credentials from the `.env` file, and write all of the data into the
graph. It will also request a secret for accessing the database and write it back to the `.env` file.

Once this finishes, you will need to use Tigergraph GraphStudio to install queries - see instructions below [Installing queries in GraphStudio], and then return here.

Once ShockNet has initialised, and you have installed the queries manually, then you can launch ShockNet, from the same directory:
`docker run -it -p 127.0.0.1:9000:5000 -v $(pwd)/.env:/usr/src/app/.env --rm --name shocknet byronthomas712/shocknet:latest`

This will launch with the webserver running inside the container, available at port 9000, so to launch the
app, you just need to open your browser to http://127.0.0.1:9000 

### Installing & running - using Python

Assuming that you have python version 3.7 available locally (I suggest you use a tool like [pyenv](https://github.com/pyenv/pyenv) if you need to manage multiple python versions and dependency environments), you should do the following

1. Clone this repo
2. In the root folder that you cloned, copy the `.env.template` file to be `.env`, i.e. `cp .env.template .env`
3. Edit the `.env` file to update the HOSTNAME, PASSWORD and USERNAME variables to connect to your Tigergraph cloud instance
4. Install the python dependencies locally using `pip install -r requirements.txt`

Then you can run ShockNet to initialise the graph DB for you, from the root folder of this repo on your machine:
`python -m shocknet.start --initialise`

This will create the schema, by using the credentials from the `.env` file, and write all of the data into the
graph. It will also request a secret for accessing the database and write it back to the `.env` file.

Once this finishes, you will need to use Tigergraph GraphStudio to install queries - see instructions below [Installing queries in GraphStudio], and then return here.

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

## Known Issues and Future Improvements

Explain known liminations within the project and potential next steps. 

## Reflections

Review the steps you took to create this project and the resources you were provided. Feel free to indiciate room for improvement and general reflections.

## References

Please give credit to other projects, videos, talks, people, and other sources that have inspired and influenced your project. 
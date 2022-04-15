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

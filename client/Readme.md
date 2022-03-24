## Where I left this (24th March)

The map kind of works:
* For some reason, it won't draw arcs if using the main plugin, but if I incorporate
my own copy-pasted version as `arc2` that does draw all of the arcs
* The issue with the arcs is the D3 selection `destXY = self.path.centroid(svg.select('path.' + datum.destination).data()[0]);` - for whatever reason this isn't working with the US state labels:
    * I though just changing this to `'path.datamaps-subunit.' + datum.destination` would be sufficient based on how the SVG renders
    * But I didn't even need to do this, just extracted it to my codebase and it seems to work
* However, the arcs themselves aren't that great

I think this is way better than the python solution, and probably a bit easier to work
with than the full-blown React version in `client-old` - although it should be noted
that the React version itself didn't cause either of the issues (scaling - just adding a `height` to the config helped, presumably I could do that in HTML also; or the arcs - see above).

I feel like there is a way forwards with this:
* If there is something that is actually worth visualising and interacting with, then probably start from this control but use raw d3 to actually pick up some of the country tiles, find their locations, and then can use d3 to add lines between them with more control than what we have here
* But that is quite a lot of effort, so don't bother unless the graph analysis shows something promising
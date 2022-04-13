import { mapShockGroups } from "./visualisation/map";
const mapControl = 'TODO';

export function runShockGroups(axInstance, useWeakAnalysis) {
    console.log("Running shock group analysis for", useWeakAnalysis);
    axInstance.post(
        '/communities', {
            use_weak_cc: useWeakAnalysis
        })
        .then(function (response)
        {
            console.log('Got a successful response');
            console.log(response['data']);
            mapShockGroups(mapControl, response['data']);
        })
        .catch(function (error) 
        {
            console.log('Error!!!', error);
        });    
}
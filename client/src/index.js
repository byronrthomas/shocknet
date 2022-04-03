import axios from 'axios';
import {initMap} from './map';

// TODO: pull from env
const HOST = 'http://127.0.0.1:5000'
const axInstance = axios.create({
    baseURL: HOST,
    // Match TG timeout at least
    timeout: 60000
  });

axInstance.post(
    '/reachable', {
        supply_shocked_producers: ['mex-oil', 'usa-oil']
    })
    .then(function (response)
    {
        console.log('Got a successful response');
        console.log(response['data']);
        initMap(response['data'], document.getElementById("map"));
    })
    .catch(function (error) 
    {
        console.log('Error!!!', error);
    });


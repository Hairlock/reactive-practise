/**
 * Created by yannick on 24-01-2016.
 */
import Rx from 'rx';

console.clear();

var array = ['1', '2', '3', '4', '5'];

var source = Rx.Observable.interval(400).take(5)
    .map(i => ['1', '2', '3', '4', '5'][i])

var result = source
    .map(x => parseInt(x))
    .filter(x => x != null)
    .reduce((x,y) => x + y);

var arrayResult = source
    .map(x => parseInt(x))
    .filter(x => x != null)
    .reduce((x,y) => x + y);




result.subscribe(x => console.log(x));


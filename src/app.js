import Rx from 'rx';
import Cycle from '@cycle/core';
import {div, input, button, h1, h2, h4, p, a, span, makeDOMDriver} from '@cycle/dom';
import isolate from '@cycle/isolate';
import {makeHTTPDriver} from '@cycle/http';

function toggle(sources) {
    const sinks = {
        DOM: sources.DOM.select('input').events('change')
            .map(e => e.target.checked)
            .startWith(false)
            .map(toggled =>
                div([
                    input({type: 'checkbox'}), 'Toggle me',
                    p(`${toggled ? 'on' : 'off'}`)
                ])
            )
    };
    return sinks;
}

function randomUser(sources) {
    const click$ = sources.DOM.select('.get-random').events('click');
    const usersURL = 'http://jsonplaceholder.typicode.com/users/';

    const getRandomUser$ = click$.map(() => {
        const randomNum = Math.round(Math.random() * 9) + 1;
        return {
            url: usersURL + String(randomNum),
            method: 'GET'
        };
    });

    const user$ = sources.HTTP
        .filter(res$ => res$.request.url.indexOf(usersURL) === 0)
        .mergeAll()
        .map(res => res.body)
        .startWith(null);

    const vtree$ = user$.map(user =>
        div('.users', [
            button('.get-random', 'Get random user'),
            user === null ? null : div('.user-details', [
                h1('.user-name', user.name),
                h4('.user-email', user.email),
                a('.user-website', {href: user.website}, user.website)
            ])
        ])
    );

    return {
        DOM: vtree$,
        HTTP: getRandomUser$
    };
}

function counter(sources) {

    const action$ = Rx.Observable.merge(
        sources.DOM.select('.decrement').events('click').map(ev => -1),
        sources.DOM.select('.increment').events('click').map(ev => +1)
    )

    const count$ = action$
        .startWith(0)
        .scan((x, y) => x + y);

    return {
        DOM: count$.map(count =>
            div([
                button('.decrement', 'Decrement'),
                button('.increment', 'Increment'),
                p('Counter: ' + count)
            ])
        )
    };
}

// ------------------------ Calculate BMI ------------------------------------


function renderWeightSlider(weight) {
    return div([
        `Weight ${weight} kg`,
        input('#weight', {type: 'range', min: 40, max: 140, value: weight})
    ])
}

function renderHeightSlider(height) {
    return div([
        `Height ${height} kg`,
        input('#height', {type: 'range', min: 140, max: 210, value: height})
    ])
}

function calculateBMI(weight, height) {
    const heightMeters = height * 0.01;
    return Math.round(weight / (heightMeters * heightMeters));
}

function intent(DOM) {
    return {
        changeWeight$: DOM.select('#weight')
            .events('input')
            .map(e => e.target.value),
        changeHeight$: DOM.select('#height')
            .events('input')
            .map(e => e.target.value)
    };
}

function model(actions) {
    return Rx.Observable.combineLatest(
        actions.changeWeight$.startWith(70),
        actions.changeHeight$.startWith(170),
        (weight, height) =>
            ({weight, height, bmi: calculateBMI(weight, height)})
    );
}

function view(state$) {
    return state$.map(({weight, height, bmi}) =>
        div([
            renderWeightSlider(weight),
            renderHeightSlider(height),
            h2(`BMI is ${bmi}`)
        ])
    )
}

function bmiCalculator({DOM}) {
    return {
        DOM: view(model(intent(DOM)))
    };
}


//------------------------- Labeled Slider ---------------------------

function LabeledSlider(sources) {
    const initialValue$ = sources.props$
        .map(props => props.initial)
        .first();

    const newValue$ = sources.DOM
        .select('.slider')
        .events('input')
        .map(e => e.target.value);

    const value$ = initialValue$.concat(newValue$);

    const vtree$ = Rx.Observable.combineLatest(sources.props$, value$,
        (props, value) =>
            div('.labeled-slider', [
                span('.label',
                    `${props.label} ${value} ${props.unit}`
                ),
                input('.slider', {
                    type: 'range',
                    min: props.min,
                    max: props.max,
                    value
                })
            ])
    );

    return {
        DOM: vtree$,
        value$
    };
}

function main(sources) {
    const props$ = Rx.Observable.of({
        label: 'Radius',
        unit: '',
        min: 10,
        max: 100,
        initial: 30
    });

    const childSources = {
        DOM: sources.DOM,
        props$
    };

    const labeledSlider = LabeledSlider(childSources);

    const childVTree$ = labeledSlider.DOM;
    const childValue$ = labeledSlider.value$;

    const vtree$ = childVTree$.withLatestFrom(childValue$,
        (childVTree, value) =>
            div([
                childVTree,
                div({
                    style: {
                        backgroundColor: '#58D3D8',
                        width: String(value) + 'px',
                        height: String(value) + 'px',
                        borderRadius: String(value * 0.5) + 'px'
                    }
                })
            ])
    );

    return {
        DOM: vtree$
    }

}


//Cycle.run(main, {
//    props$: () => Rx.Observable.of({
//        label: 'Weight',
//        unit: 'kg',
//        min: 40,
//        max: 140,
//        initial: 70
//    }),
//    DOM: makeDOMDriver('#app')
//});


//----------------------- BMI Component -------------------------


function bmiComponent(sources) {
    const weightProps$ = Rx.Observable.of({
        label: 'Weight', unit: 'kg', min: 40, initial: 70, max: 150
    });
    const heightProps$ = Rx.Observable.of({
        label: 'Height', unit: 'cm', min: 140, initial: 170, max: 210
    });

    const weightSources = {DOM: sources.DOM, props$: weightProps$};
    const heightSources = {DOM: sources.DOM, props$: heightProps$};

    const weightSlider = isolate(LabeledSlider)(weightSources);
    const heightSlider = isolate(LabeledSlider)(heightSources);

    const weightVTree$ = weightSlider.DOM;
    const weightValue$ = weightSlider.value$;

    const heightVTree$ = heightSlider.DOM;
    const heightValue$ = heightSlider.value$;

    const bmi$ = Rx.Observable.combineLatest(weightValue$, heightValue$,
        (weight, height) => {
            const heightMeters = height * 0.01;
            return Math.round(weight / (heightMeters * heightMeters));
        }
    );

    return {
        DOM: bmi$.combineLatest(weightVTree$, heightVTree$,
            (bmi, weightVTree, heightVTree) =>
                div([
                    weightVTree,
                    heightVTree,
                    h2('BMI is ' + bmi)
                ])
        )
    };
}

Cycle.run(bmiComponent, {
    DOM: makeDOMDriver('#app')
});

//Cycle.run(bmiCalculator, {
//    DOM: makeDOMDriver('#app')
//});

//Cycle.run(bmiCalculator, {
//    DOM: makeDOMDriver('#app')
//});

//Cycle.run(counter, {
//    DOM: makeDOMDriver('#app')
//});

//Cycle.run(randomUser, {
//    DOM: makeDOMDriver('#app'),
//    HTTP: makeHTTPDriver()
//});

//Cycle.run(toggle, {
//    DOM: makeDOMDriver('#app')
//});


import React from 'react'
import "./App.css"
import { BrowserRouter, Redirect, Route, Switch } from 'react-router-dom';
import Core from "./ThreeJS/Core"
import Plane from "./rf3-plane/Plane"
import Character from './r3f-character/Character';

const App = () => {
    return (
        <div className='app' >
            <BrowserRouter>
                <Switch>
                    <Redirect path='/' exact to='/character' />
                    <Route path='/three'>
                        <Core />
                    </Route>
                    <Route path='/plane'>
                        <Plane />
                    </Route>
                    <Route path='/character'>
                        <Character />
                    </Route>
                </Switch>
            </BrowserRouter>
        </div>
    )
}

export default App

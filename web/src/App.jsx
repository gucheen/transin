import React from 'react'
import { Switch, Route } from 'wouter'
import './App.css'
import Main from './components/main'
import ImageRegionMarker from './components/image-region-marker'
import { Windows } from './components/windows'

function App() {
  return (
    <>
      <Switch>
        <Route path='/image-region-marker' component={ImageRegionMarker} />
        <Route path='/windows' component={Windows} />
        <Route path='/' component={Main} />
      </Switch>
    </>
  )
}

export default App

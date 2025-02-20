import React from 'react'
import { Switch, Route } from 'wouter'
import './App.css'
import Main from './components/main'
import ImageRegionMarker from './components/image-region-marker'

function App() {
  return (
    <>
      <Switch>
      <Route path='/image-region-marker' component={ImageRegionMarker} />
        <Route path='/' component={Main} />
      </Switch>
    </>
  )
}

export default App

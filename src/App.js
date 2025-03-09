


import React from 'react';
import { BrowserRouter as Router, Routes,Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import Register from './Register';



const App = () => {
  return (
    <Router>
      <Routes>
      <Route exact path="/" element={<Dashboard/>} />
          <Route path="/register" element={<Register/>} />
      </Routes>
      
    </Router>
  );
};

export default App;

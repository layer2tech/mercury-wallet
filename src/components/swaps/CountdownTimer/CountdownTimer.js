import React, {useState, useEffect} from 'react';
import './CountdownTimer.css';
// Credit: Mateusz Rybczonec

const CountdownTimer = (props) => {
    const [initTime,setInitTime] = useState(60*6)
    //Time needs updating when swap frequency changes

    const [timeRemaining,setTimeRemaining] = useState("")
    const [colour,setColour] = useState("")
    const [colourCodes, setColourCodes] = useState({
        info: {
            color: "green"
          },
          warning: {
            color: "orange",
            threshold: 120
          },
          alert: {
            color: "red",
            threshold: 60
          },
          finish: {
            color: "blue",
            threshold: 0
          }

    })

    const [rerender,setReRender] = useState(false)
    
    const FULL_DASH_ARRAY = 283;


    useEffect(()=> {
        
        const interval = setInterval(()=> {
          
            setTimeRemaining(runClock())
            circleDasharray();
            remainingPathColor(props.swapTime - (Date.now()/1000));
            
        },1000)
        return () => clearInterval(interval)
    },[props.swapTime])

    const digits = (number) => number<10 ? ("0"+number):(number)

    const runClock = () => {
        const date = Date.now()/1000;
        const countdown = props.swapTime - date
        
        let hours=0;
        let minutes=0;
        let seconds=0;

        if(countdown>=0){
            hours = Math.floor(countdown/(60*60))
            minutes = Math.floor((countdown-(hours*3600))/60)
            seconds = countdown%60
        } else{
            hours = 0
            minutes = 0
            seconds = 0
        }

        const now = {
            h: hours,
            m: minutes,
            s: seconds,
        };

        
        now.h = `${digits(now.h)}`
        now.m = `${digits(now.m)}`
        now.s = `${digits(now.s)}`

        now.h0 = now.h[0]
        now.h1 = now.h[1]
        now.m0 = now.m[0]
        now.m1 = now.m[1]
        now.s0 = now.s[0]
        now.s1 = now.s[1]

        remainingPathColor(countdown)
        if (countdown<0 && countdown > - 20){
          //16E8 ensures that while loading props.swapTime, swap doesnt appear Live
          return "SWAPS LIVE!!"
        }

        return `${now.h0}${now.h1}:${now.m0}${now.m1}:${now.s0}${now.s1}`
    }

    const calculateTimeFraction = () => {
        let rawTimeFraction = (props.swapTime - (Date.now()/1000)) / initTime; // 21600 = Total time till expiry
        return rawTimeFraction - ((1 / initTime) * (1 - rawTimeFraction));
    }

    const circleDasharray = () => {
      let timeFraction = calculateTimeFraction()*FULL_DASH_ARRAY

      if((calculateTimeFraction()*FULL_DASH_ARRAY) <= 0){
        if(rerender === false){
          setReRender(true)
        }
        return "283 283"
      }
      const circleDasharray = `${(timeFraction).toFixed(0)} 283`;
      return circleDasharray
    }

    const remainingPathColor = (timeLeft) => {
      const { alert, warning, info, finish } = colourCodes;

      let colour
      // if(timeLeft === undefined){
      //   colour = document.getElementById("base-timer-path-remaining").classList[1]
      // }

      if(timeLeft>alert.threshold){
        setColour("green")
      }
      

      if(timeLeft <= warning.threshold && timeLeft > - 20){
        setColour("orange")
      }

      if(timeLeft <= alert.threshold && timeLeft > - 20){
        setColour("red")
      }

      if(timeLeft <= finish.threshold && timeLeft > - 20){
        setColour("blue")
      }

      return colour

    }

    return(
    <div className="base-timer">
        <svg className="base-timer__svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <g className="base-timer__circle">
            <circle className="base-timer__path-elapsed" cx="50" cy="50" r="45"></circle>
            <path
              id="base-timer-path-remaining"
              strokeDasharray={`${circleDasharray()}`}
              className={`base-timer__path-remaining ${colour}`}
              d="
                M 50, 50
                m -45, 0
                a 45,45 0 1,0 90,0
                a 45,45 0 1,0 -90,0
              "
            ></path>
          </g>
        </svg>
        <span id="base-timer-label" className="base-timer__label">{timeRemaining}</span>
      </div> 
    )
}

export default CountdownTimer;
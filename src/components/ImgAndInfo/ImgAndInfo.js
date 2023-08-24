import Tooltip from "../Tooltips/Tooltip"

const ImgAndInfo = ({imgsrc1, imgsrc2, bClass, 
    boldText, condition, subText, imgSubText,
    tooltipBoldText, tooltipText}) => {
    return (
        <div className = "CoinAmount-block">
            <img src = {imgsrc1} alt = "icon" className = "privacy"/>
            <span className = "sub" >
                <b className = {bClass} >{boldText}</b>
                <div className = "scoreAmount">
                    {condition ? (
                        <>
                            {subText}
                        </>
                    ):(
                        <>
                        <img alt = "icon" src = {imgsrc2} className = "privacy" />
                        {imgSubText}
                        <Tooltip 
                            boldText = {tooltipBoldText}
                            text = {tooltipText}/>
                        </>
                    )}
                </div>
            </span>
        </div>
    )
}


export default ImgAndInfo;

const Tooltip = ({ condition = true, className, title, boldText, text }) => {

    return(
        condition &&(
            <div className={className && className}>
                <span className="tooltip">
                {title && <div><b>{title}</b></div>}
                    <div>
                    {boldText && <b>{boldText}</b>}{text && ` ${text}`}
                    </div>
                </span>
            </div>
        )
    )
}

export default Tooltip;
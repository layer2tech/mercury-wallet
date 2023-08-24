'use strict';
// Address text input component.

const AddresInput = (props) => {
  return (
    <div>
       <div className="inputs">
           <input
            type="text"
            placeholder={props.placeholder}
            value={props.inputAddr}
            onChange={props.onChange}/>
           <span className="smalltxt">{props.smallTxtMsg}</span>
       </div>
     </div>
  )
}

export default AddresInput;

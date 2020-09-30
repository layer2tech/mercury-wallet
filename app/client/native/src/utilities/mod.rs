// use std::ffi::CString;
// use std::os::raw::c_char;

// pub fn error_to_c_string(e: failure::Error) -> *mut c_char {
//     CString::new(format!("Error: {}", e.to_string())).unwrap().into_raw()
// }

pub mod requests;

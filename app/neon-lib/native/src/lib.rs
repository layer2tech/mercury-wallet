use neon::prelude::*;
use neon::register_module;

fn hello_world(mut cx: FunctionContext) -> JsResult<JsString> {
    Ok(cx.string("hello world!"))
}

// register_module!(mut m, { m.export_function("helloWorld", hello_world) });


use curv::FE;
use curv::elliptic::curves::traits::ECScalar;
use serde_json;

fn crypto_lib(mut cx: FunctionContext) -> JsResult<JsString> {
    let rand: FE = ECScalar::new_random();
    Ok(cx.string(serde_json::to_string(&rand).unwrap()))
}

register_module!(mut m, {
        m.export_function("cryptoLib", crypto_lib)?;
        m.export_function("helloWorld", hello_world)?;
        Ok(())
    }
);

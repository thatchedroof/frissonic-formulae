use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);

    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen(start)]
fn start() -> Result<(), JsValue> {
    wasm_logger::init(wasm_logger::Config::default());
    console_error_panic_hook::set_once();
    Ok(())
}

#[wasm_bindgen]
pub fn greet(name: &str) {
    log(&format!("Hello from rust, {}!", name));
    alert(&format!("Hello from rust, {}!", name));
}

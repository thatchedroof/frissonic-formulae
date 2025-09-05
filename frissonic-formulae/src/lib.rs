use std::str::FromStr;

use guitar_chords::note::{Interval12, PitchClass12};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Deserialize, Serialize, Debug, Clone)]
struct ChordData {
    chords: String,
    bpm: String,
    video_id: String,
}

#[wasm_bindgen]
pub fn accidental_to_ascii(input: String) -> String {
    input.replace("♭", "b").replace("♯", "#")
}

#[wasm_bindgen]
pub fn absolute_to_relative(input: &str, key: &str) -> String {
    let re = regex::Regex::new(r"([A-Ga-g][#♯b♭♮𝄫𝄪]?)(m?)").unwrap();
    let key = PitchClass12::from_str(key).unwrap();

    let result = re.replace_all(input, |caps: &regex::Captures| {
        let note = &caps[1];
        let minor = &caps[2] == "m";

        let pitch = PitchClass12::from_str(note).unwrap();
        let relative = (pitch - key).to_string();

        if minor {
            relative.to_lowercase()
        } else {
            relative
        }
    });

    accidental_to_ascii(result.to_string())
}

#[wasm_bindgen]
pub fn relative_to_absolute(input: &str, key: &str) -> String {
    let re = regex::RegexBuilder::new(r"([#♯b♭♮𝄫𝄪]?)([IVX]+)([#♯b♭♮𝄫𝄪]?)")
        .case_insensitive(true)
        .build()
        .unwrap();
    let key = PitchClass12::from_str(key).unwrap();

    let result = re.replace_all(input, |caps: &regex::Captures| {
        let mut numeral = String::new();
        numeral.push_str(&caps[1]);
        numeral.push_str(&caps[2].to_uppercase());
        numeral.push_str(&caps[3]);

        let minor = caps[2].chars().all(|c| c.is_lowercase());

        let relative = Interval12::from_str(&numeral).unwrap();
        let absolute = (key + relative).to_string();

        if minor {
            absolute + "m"
        } else {
            absolute
        }
    });

    accidental_to_ascii(result.to_string())
}

#[wasm_bindgen]
pub fn chordDifferences(input: &str) -> String {
    let re = regex::Regex::new(r"([A-Ga-g][#♯b♭♮𝄫𝄪]?)").unwrap();

    let mut lastNote = None;

    let result = re.replace_all(input, |caps: &regex::Captures| {
        let note = &caps[1];
        let pitch = PitchClass12::from_str(note).unwrap();

        if let Some(last) = lastNote {
            lastNote = Some(pitch);

            (last - pitch).to_string()
        } else {
            lastNote = Some(pitch);
            "N.C.".to_string()
        }
    });

    accidental_to_ascii(result.to_string())
}

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

// #[wasm_bindgen]
// pub fn save_chord_data(chord_data: JsValue) {
//     let chord_data: ChordData = chord_data.into_serde().unwrap();
//     let ron = ron::ser::to_string(&chord_data).unwrap();

//     // Save the RON string to local storage
//     let storage = web_sys::window().unwrap().local_storage().unwrap().unwrap();
//     storage.set_item("chord_data", &ron).unwrap();
//     log(&format!("Saved chord data: {:?}", chord_data));
// }

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_absolute_to_relative() {
        let input = "Cm Db Dbm F G A B";
        let key = "C#";
        let result = absolute_to_relative(input, key);
        println!("{}", result);
    }

    #[test]
    fn test_relative_to_absolute() {
        let input = "I II iii IV bv VI VII";
        let key = "C";
        let result = relative_to_absolute(input, key);
        println!("{}", result);
    }

    #[test]
    fn test_chord_differences() {
        let input = "G F#m D G F#m C E G#m D# Bb C# G#m E F# B";
        let result = chordDifferences(input);
        println!("{}", result);
    }
}

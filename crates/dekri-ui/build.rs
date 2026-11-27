// Menanamkan ikon ke dekri-lab.exe (Windows). Di platform lain tidak melakukan apa-apa.
fn main() {
    println!("cargo:rerun-if-changed=icon.rc");
    println!("cargo:rerun-if-changed=icon.ico");
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        let _ = embed_resource::compile("icon.rc", embed_resource::NONE);
    }
}

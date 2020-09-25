
  gltf-transform 0.7.0-alpha.4 — Commandline interface for the glTF-Transform SDK.

  USAGE 
  
    ▸ gltf-transform <command> [ARGUMENTS...] [OPTIONS...]


  COMMANDS — Type 'gltf-transform help <command>' to get some help about a command

                                                                                                
                                                                                                
                                         ──────────────────── 🔎 INSPECT ─────────────────────  
    inspect                              Inspect the contents of the model                      
    validate                             Validate the model against the glTF spec               
                                                                                                
                                                                                                
                                         ──────────────────── 📦 PACKAGE ─────────────────────  
    copy                                 Copy the model with minimal changes                    
    merge                                Merge two or more models into one                      
    partition                            Partition mesh data into separate .bin files           
                                                                                                
                                                                                                
                                         ───────────────────── ✨ STYLE ──────────────────────  
    ao                                   Bake per-vertex ambient occlusion                      
    metalrough                           Convert materials from spec/gloss to metal/rough       
    unlit                                Convert materials from metal/rough to unlit            
    center                               Centers the scene at the origin, or above/below it     
    sequence                             Animate nodes' visibilities as a flipboard sequence    
                                                                                                
                                                                                                
                                         ──────────────────── ⏩ OPTIMIZE ────────────────────  
    dedup                                Deduplicate accessors and textures                     
    gzip                                 Compress the model with gzip                           
    etc1s                                Compress textures with KTX + Basis ETC1S               
    uastc                                Compress textures with KTX + Basis UASTC               

  GLOBAL OPTIONS

    -h, --help                           Display global help or command-related help.           
    -V, --version                        Display version.                                       
    -v, --verbose                        Verbose mode: will also output debug messages.         


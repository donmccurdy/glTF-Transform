
  gltf-transform 0.5.4 — Commandline interface for the glTF-Transform SDK.

  USAGE 
  
    ▸ gltf-transform <command> [ARGUMENTS...] [OPTIONS...]


  COMMANDS — Type 'gltf-transform help <command>' to get some help about a command

    inspect                              🔎 Inspect the contents of the model                   
    validate                             🔎 Validate the model against the glTF spec            
    copy                                 📦 Copy the model with minimal changes                 
    merge                                📦 Merge two or more models into one                   
    partition                            📦 Partition mesh data into separate .bin files        
    ao                                   ✨ Bake per-vertex ambient occlusion                   
    metalrough                           ✨ Convert materials from spec/gloss to metal/rough    
    unlit                                ✨ Convert materials to an unlit model                 
    dedup                                ⏩ Deduplicate accessors and textures                  
    gzip                                 ⏩ Compress the model with gzip                        
    etc1s                                ⏩ Compress textures with KTX + Basis ETC1S            
    uastc                                ⏩ Compress textures with KTX + Basis UASTC            

  GLOBAL OPTIONS

    -h, --help                           Display global help or command-related help.           
    -V, --version                        Display version.                                       
    -v, --verbose                        Verbose mode: will also output debug messages.         


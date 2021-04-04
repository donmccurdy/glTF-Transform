
  gltf-transform 0.9.8 — Commandline interface for the glTF-Transform SDK.

  USAGE 
  
    ▸ gltf-transform <command> [ARGUMENTS...] [OPTIONS...]


  COMMANDS — Type 'gltf-transform help <command>' to get some help about a command

                                                                                                
                                                                                                
                                         🔎 INSPECT ──────────────────────────────────────────  
    inspect                              Inspect the contents of the model                      
    validate                             Validate the model against the glTF spec               
                                                                                                
                                                                                                
                                         📦 PACKAGE ──────────────────────────────────────────  
    copy                                 Copy the model with minimal changes                    
    merge                                Merge two or more models into one                      
    partition                            Partition binary data into separate .bin files         
    dedup                                Deduplicate accessors and textures                     
    prune                                Remove unreferenced properties from the file           
    gzip                                 Compress the model with lossless gzip                  
                                                                                                
                                                                                                
                                         🌍 SCENE ────────────────────────────────────────────  
    center                               Center the scene at the origin, or above/below it      
    instance                             Create GPU instances from shared Mesh references       
                                                                                                
                                                                                                
                                         🕋 GEOMETRY ─────────────────────────────────────────  
    draco                                Compress mesh geometry with Draco                      
    quantize                             Quantize mesh vertex attributes                        
    weld                                 Index geometry and optionally merge similar vertices   
    unweld                               De-index geometry, disconnecting any shared vertices   
    tangents                             Generate MikkTSpace vertex tangents                    
                                                                                                
                                                                                                
                                         ✨ MATERIAL ─────────────────────────────────────────  
    ao                                   Bake per-vertex ambient occlusion                      
    metalrough                           Convert materials from spec/gloss to metal/rough       
    unlit                                Convert materials from metal/rough to unlit            
                                                                                                
                                                                                                
                                         🖼  TEXTURE ──────────────────────────────────────────  
    etc1s                                KTX + Basis ETC1S texture compression                  
    uastc                                KTX + Basis UASTC texture compression                  
                                                                                                
                                                                                                
                                         ⏯  ANIMATION ────────────────────────────────────────  
    resample                             Resample animations, losslessly deduplicating keyframes
    sequence                             Animate nodes' visibilities as a flipboard sequence    

  GLOBAL OPTIONS

    -h, --help                           Display global help or command-related help.           
    -V, --version                        Display version.                                       
    -v, --verbose                        Verbose mode: will also output debug messages.         
    --vertex-layout <layout>             Vertex layout method                                   
                                         one of "interleaved","separate", default: "interleaved"


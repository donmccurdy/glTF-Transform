
  gltf-transform 3.2.0 — Command-line interface (CLI) for the glTF Transform SDK.

  USAGE 
  
    ▸ gltf-transform <command> [ARGUMENTS...] [OPTIONS...]


  COMMANDS — Type 'gltf-transform help <command>' to get some help about a command

                                                                                                
                                                                                                
                                         🔎 INSPECT ──────────────────────────────────────────  
    inspect                              Inspect contents of the model                          
    validate                             Validate model against the glTF spec                   
                                                                                                
                                                                                                
                                         📦 PACKAGE ──────────────────────────────────────────  
    copy                                 Copy model with minimal changes                        
    optimize                             ✨ Optimize model by all available methods             
    merge                                Merge two or more models into one                      
    partition                            Partition binary data into separate .bin files         
    dedup                                Deduplicate accessors and textures                     
    prune                                Remove unreferenced properties from the file           
    gzip                                 Compress model with lossless gzip                      
    xmp                                  Add or modify XMP metadata                             
                                                                                                
                                                                                                
                                         🌍 SCENE ────────────────────────────────────────────  
    center                               Center the scene at the origin, or above/below it      
    instance                             Create GPU instances from shared mesh references       
    flatten                              ✨ Flatten scene graph                                 
    join                                 ✨ Join meshes and reduce draw calls                   
                                                                                                
                                                                                                
                                         🕋 GEOMETRY ─────────────────────────────────────────  
    draco                                Compress geometry with Draco                           
    meshopt                              Compress geometry and animation with Meshopt           
    quantize                             Quantize geometry, reducing precision and memory       
    dequantize                           Dequantize geometry                                    
    weld                                 Index geometry and optionally merge similar vertices   
    unweld                               De-index geometry, disconnecting any shared vertices   
    tangents                             Generate MikkTSpace vertex tangents                    
    reorder                              Optimize vertex data for locality of reference         
    simplify                             Simplify mesh, reducing number of vertices             
                                                                                                
                                                                                                
                                         🎨 MATERIAL ─────────────────────────────────────────  
    metalrough                           Convert materials from spec/gloss to metal/rough       
    unlit                                Convert materials from metal/rough to unlit            
                                                                                                
                                                                                                
                                         🖼  TEXTURE ──────────────────────────────────────────  
    resize                               Resize PNG or JPEG textures                            
    etc1s                                KTX + Basis ETC1S texture compression                  
    uastc                                KTX + Basis UASTC texture compression                  
    ktxfix                               Fixes common issues in KTX texture metadata            
    avif                                 ✨ AVIF texture compression                            
    webp                                 WebP texture compression                               
    png                                  PNG texture compression                                
    jpeg                                 JPEG texture compression                               
                                                                                                
                                                                                                
                                         ⏯  ANIMATION ────────────────────────────────────────  
    resample                             Resample animations, losslessly deduplicating keyframes
    sequence                             Animate node visibilities as a flipboard sequence      
    sparse                               ✨ Reduces storage for zero-filled arrays              

  GLOBAL OPTIONS

    -h, --help                           Display global help or command-related help.           
    -V, --version                        Display version.                                       
    -v, --verbose                        Verbose mode: will also output debug messages.         
    --allow-http                         Allows reads from HTTP requests.                       
                                         boolean                                                
    --vertex-layout <layout>             Vertex buffer layout preset.                           
                                         one of "interleaved","separate", default: "interleaved"
    --config <path>                      Installs custom commands or extensions. (EXPERIMENTAL) 



import glslangModule from "https://unpkg.com/@webgpu/glslang@0.0.8/dist/web-devel/glslang.js";

(async () => {
  if (!navigator.gpu) {
    console.log('WebGPU is not supported. Enable chrome://flags/#enable-unsafe-webgpu flag.')
    return;
  }

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  const arrayBuffer = new Int32Array(32769);
            for (var w = 1; w < 32769; w++) {
                arrayBuffer[w] = (w-1);  //Math.floor(Math.random() * 10);
            }
            arrayBuffer[0]=32768;
  // Get a GPU buffer in a mapped state and an arrayBuffer for writing.
  const gpuWriteBuffer = device.createBuffer({
    mappedAtCreation: true,
    size: 131076,
    usage: GPUBufferUsage.STORAGE
  });
  const arrayBufferFirst = gpuWriteBuffer.getMappedRange();

 new Int32Array(arrayBufferFirst).set(arrayBuffer);
  // Unmap buffer so that it can be used later for copy.
  gpuWriteBuffer.unmap();


// Get a GPU buffer in a mapped state and an arrayBuffer for writing.
  const arrayBuffer1 = new Int32Array(32769);
            for (var w = 0; w < 32769; w++) {
                arrayBuffer1[w] = Math.floor(Math.random() * 10);
            }
  // Get a GPU buffer in a mapped state and an arrayBuffer for writing.
  const gpuWriteBuffer1 = device.createBuffer({
    mappedAtCreation: true,
    size: 131076,
    usage: GPUBufferUsage.STORAGE
  });
  const arrayBufferSecond = gpuWriteBuffer1.getMappedRange();

 new Int32Array(arrayBufferSecond).set(arrayBuffer1);
  // Unmap buffer so that it can be used later for copy.
  gpuWriteBuffer1.unmap();

  const resultBuffer = device.createBuffer({
    size: 160000,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
  });

  const bindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        type: "readonly-storage-buffer"
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        type: "readonly-storage-buffer"
      },
      
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        type: "storage-buffer"
      }
    ]
  });

const bindGroup = device.createBindGroup({
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: gpuWriteBuffer
        }
      },
      {
        binding: 1,
        resource: {
          buffer: gpuWriteBuffer1
        }
      },
      {
        binding: 2,
        resource: {
          buffer: resultBuffer 
        }
      }
    ]
  });

// Compute shader code (GLSL)

  const computeShaderCode = `#version 450
  #pragma optimize(off)
  layout (local_size_x = 80, local_size_y = 1, local_size_z = 1) in;
  layout(std430, set = 0, binding = 0) readonly buffer FirstArray {
      int size;
      int numbers[];
  } firstArray;

  layout(std430, set = 0, binding = 1) readonly buffer SecondArray {
      int size;
      int numbers[];
  } secondArray;



  layout(std430, set = 0, binding = 2) buffer ResultArray {
      int size;
      int numbers[];
  } resultArray;

 shared int Myshared;
 shared int dumm[1024];
   int offset = 16;
   

  void main() {
  // resultArray.size = firstArray.size; //firstMatrix.size;
  
         int temp = 8;
         int dummy1 = 9;
         int temp1 = 1;
         int dummy = 0;
         int dummy2 = 10;
         int start, end, start1, end1;
      

        uint threadIndex = gl_LocalInvocationID.x;

        Myshared =1;
        memoryBarrierShared();
      

      if(threadIndex < 64){
          
              for(int y=0; y<1000000; y++){
                atomicAdd(Myshared,1);
              
              }  
      }

      
      else if(threadIndex == 64){
        //Uncomment just this to see L3 Hit
          /*   for(int iter=0; iter<2; iter++){
               for(int h=0; h<100; h++){   //2097152; h++){
                 
                     dummy1 = secondArray.numbers[h*16];

                      dumm[998] += dummy1+temp;
                  }
              }*/
// Uncomment both above and here to see L3 Miss
           /* for(int v=0; v<2048; v++){   //2097152; h++){
               
                   dummy2 = secondArray.numbers[v*16];

                    dumm[997] += dummy2+temp;
               }*/
// LLC Miss
               for(int z=1`; z<2048; z++){   //2097152; h++){
                   // int index = unmappedPrime[h];
                    start = atomicAdd(Myshared,0);
                    resultArray.numbers[z] = firstArray.numbers[z*4];
                    dumm[999] += dummy+temp;
                    end = atomicAdd(Myshared,0);
                    //resultArray.numbers[z] = end-start;
            
                 }
                resultArray.numbers[2500] += dummy+dumm[998]+dummy1+dumm[999]+dumm[997];
            }
   
        if(threadIndex == 64){              
          resultArray.numbers[2501] += dumm[999]+temp;
        }

}
  `;

  // Pipeline setup

  const glslang = await glslangModule();

  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout]
    }),
    computeStage: {
      module: device.createShaderModule({
        code: glslang.compileGLSL(computeShaderCode, "compute")
      }),
      entryPoint: "main"
    }
  });

  // Commands submission

  const copyEncoder = device.createCommandEncoder();

  const passEncoder = copyEncoder.beginComputePass();
  passEncoder.setPipeline(computePipeline);
  passEncoder.setBindGroup(0, bindGroup);
  passEncoder.dispatch(1);
  passEncoder.endPass();


// Get a GPU buffer for reading in an unmapped state.
  const gpuReadBuffer = device.createBuffer({
    mappedAtCreation: false,
    size: 16000,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
  });

  // Encode commands for copying buffer to buffer.
  
  copyEncoder.copyBufferToBuffer(
    resultBuffer  /* source buffer */,
    0 /* source offset */,
    gpuReadBuffer /* destination buffer */,
    0 /* destination offset */,
    16000 /* size */
  );

  // Submit copy commands.
  const copyCommands = copyEncoder.finish();
  device.defaultQueue.submit([copyCommands]);

  // Read buffer.
  await gpuReadBuffer.mapAsync(GPUMapMode.READ);
  const copyArrayBuffer = gpuReadBuffer.getMappedRange();
  
  console.log(new Int32Array(copyArrayBuffer));
})();

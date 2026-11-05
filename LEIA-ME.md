# Rack telecom — R01

Modelo aproximado inspirado nas oito imagens fornecidas. Rack 600 × 600 × 1100 mm (L × P × A), espaço útil estimado de 20U. Não é projeto de fabricação ou elétrico. Marcas e formatos são representações visuais simplificadas; capacidades, modelos exatos, carga, ventilação e compatibilidade elétrica não foram confirmados.

## Arquivos
- rack-telecom.blend: projeto editável, criado no Blender 5.2.3, com iluminação e câmera.
- rack-telecom.glb: modelo com materiais, textura incorporada e animação de 12 segundos.
- previa-montado.png e previa-explodido.png: imagens renderizadas no Blender.
- index.html, app.js, styles.css e vendor: exemplo Three.js 0.187.0 com bibliotecas locais.

## Abrir o exemplo
Com Python instalado, abra um terminal nesta pasta e execute:

```sh
python -m http.server 8080 --bind 127.0.0.1
```

Acesse http://127.0.0.1:8080 no navegador. Abrir o HTML diretamente por duplo clique pode bloquear o carregamento do GLB. O exemplo não exige internet depois de extraído.

## Entender a integração
O .blend é o arquivo de trabalho. O .glb é a versão transportável para a página. Cada equipamento tem um grupo pai; suas peças acompanham o movimento desse grupo.

```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const gltf = await new GLTFLoader().loadAsync('./rack-telecom.glb');
scene.add(gltf.scene);
const mixer = new THREE.AnimationMixer(gltf.scene);
mixer.clipAction(gltf.animations[0]).play();
// Dentro do loop de renderização: mixer.update(deltaEmSegundos);
```

O exemplo pressupõe uma cena, câmera e renderizador já criados. app.js contém a implementação completa, com seleção dos equipamentos, pausa, controle de tempo e enquadramento.

Documentação: https://threejs.org/docs/pages/GLTFLoader.html e https://threejs.org/docs/pages/AnimationMixer.html

## Animação e edição
No Blender, reproduza os frames 1–289 a 24 fps. Os marcadores indicam as etapas. Coleção 01_RACK_TELECOM: 14 conjuntos, 66 malhas. A coleção 02_ESTUDIO_nao_exportado contém piso, luzes e câmera, excluídos do GLB.

Os movimentos são ilustrativos, não simulam uma sequência física segura de manutenção. Os cabos são decorativos e possuem terminações simplificadas. Ajuste as dimensões após medir os equipamentos reais.

## Verificação
GLB analisado pelo glTF Validator: zero erros e zero avisos; informações sobre UVs sem uso e dimensão da textura. Prévias montada e explodida renderizadas e inspecionadas. A integração usa GLTFLoader e AnimationMixer. A reprodução no navegador ainda não foi validada nesta entrega.

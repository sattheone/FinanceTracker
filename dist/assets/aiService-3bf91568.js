var F=Object.defineProperty;var H=(e,n,t)=>n in e?F(e,n,{enumerable:!0,configurable:!0,writable:!0,value:t}):e[n]=t;var T=(e,n,t)=>(H(e,typeof n!="symbol"?n+"":n,t),t);/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var I;(function(e){e.HARM_CATEGORY_UNSPECIFIED="HARM_CATEGORY_UNSPECIFIED",e.HARM_CATEGORY_HATE_SPEECH="HARM_CATEGORY_HATE_SPEECH",e.HARM_CATEGORY_SEXUALLY_EXPLICIT="HARM_CATEGORY_SEXUALLY_EXPLICIT",e.HARM_CATEGORY_HARASSMENT="HARM_CATEGORY_HARASSMENT",e.HARM_CATEGORY_DANGEROUS_CONTENT="HARM_CATEGORY_DANGEROUS_CONTENT"})(I||(I={}));var N;(function(e){e.HARM_BLOCK_THRESHOLD_UNSPECIFIED="HARM_BLOCK_THRESHOLD_UNSPECIFIED",e.BLOCK_LOW_AND_ABOVE="BLOCK_LOW_AND_ABOVE",e.BLOCK_MEDIUM_AND_ABOVE="BLOCK_MEDIUM_AND_ABOVE",e.BLOCK_ONLY_HIGH="BLOCK_ONLY_HIGH",e.BLOCK_NONE="BLOCK_NONE"})(N||(N={}));var w;(function(e){e.HARM_PROBABILITY_UNSPECIFIED="HARM_PROBABILITY_UNSPECIFIED",e.NEGLIGIBLE="NEGLIGIBLE",e.LOW="LOW",e.MEDIUM="MEDIUM",e.HIGH="HIGH"})(w||(w={}));var v;(function(e){e.BLOCKED_REASON_UNSPECIFIED="BLOCKED_REASON_UNSPECIFIED",e.SAFETY="SAFETY",e.OTHER="OTHER"})(v||(v={}));var _;(function(e){e.FINISH_REASON_UNSPECIFIED="FINISH_REASON_UNSPECIFIED",e.STOP="STOP",e.MAX_TOKENS="MAX_TOKENS",e.SAFETY="SAFETY",e.RECITATION="RECITATION",e.OTHER="OTHER"})(_||(_={}));var M;(function(e){e.TASK_TYPE_UNSPECIFIED="TASK_TYPE_UNSPECIFIED",e.RETRIEVAL_QUERY="RETRIEVAL_QUERY",e.RETRIEVAL_DOCUMENT="RETRIEVAL_DOCUMENT",e.SEMANTIC_SIMILARITY="SEMANTIC_SIMILARITY",e.CLASSIFICATION="CLASSIFICATION",e.CLUSTERING="CLUSTERING"})(M||(M={}));/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class E extends Error{constructor(n){super(`[GoogleGenerativeAI Error]: ${n}`)}}class b extends E{constructor(n,t){super(n),this.response=t}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const K="https://generativelanguage.googleapis.com",B="v1",j="0.2.1",Y="genai-js";var f;(function(e){e.GENERATE_CONTENT="generateContent",e.STREAM_GENERATE_CONTENT="streamGenerateContent",e.COUNT_TOKENS="countTokens",e.EMBED_CONTENT="embedContent",e.BATCH_EMBED_CONTENTS="batchEmbedContents"})(f||(f={}));class p{constructor(n,t,r,s){this.model=n,this.task=t,this.apiKey=r,this.stream=s}toString(){let n=`${K}/${B}/${this.model}:${this.task}`;return this.stream&&(n+="?alt=sse"),n}}function $(){return`${Y}/${j}`}async function m(e,n,t){let r;try{if(r=await fetch(e.toString(),Object.assign(Object.assign({},k(t)),{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-client":$(),"x-goog-api-key":e.apiKey},body:n})),!r.ok){let s="";try{const o=await r.json();s=o.error.message,o.error.details&&(s+=` ${JSON.stringify(o.error.details)}`)}catch{}throw new Error(`[${r.status} ${r.statusText}] ${s}`)}}catch(s){const o=new E(`Error fetching from ${e.toString()}: ${s.message}`);throw o.stack=s.stack,o}return r}function k(e){const n={};if((e==null?void 0:e.timeout)>=0){const t=new AbortController,r=t.signal;setTimeout(()=>t.abort(),e.timeout),n.signal=r}return n}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function R(e){return e.text=()=>{if(e.candidates&&e.candidates.length>0){if(e.candidates.length>1&&console.warn(`This response had ${e.candidates.length} candidates. Returning text from the first candidate only. Access response.candidates directly to use the other candidates.`),x(e.candidates[0]))throw new b(`${S(e)}`,e);return J(e)}else if(e.promptFeedback)throw new b(`Text not available. ${S(e)}`,e);return""},e}function J(e){var n,t,r,s;return!((s=(r=(t=(n=e.candidates)===null||n===void 0?void 0:n[0].content)===null||t===void 0?void 0:t.parts)===null||r===void 0?void 0:r[0])===null||s===void 0)&&s.text?e.candidates[0].content.parts[0].text:""}const q=[_.RECITATION,_.SAFETY];function x(e){return!!e.finishReason&&q.includes(e.finishReason)}function S(e){var n,t,r;let s="";if((!e.candidates||e.candidates.length===0)&&e.promptFeedback)s+="Response was blocked",!((n=e.promptFeedback)===null||n===void 0)&&n.blockReason&&(s+=` due to ${e.promptFeedback.blockReason}`),!((t=e.promptFeedback)===null||t===void 0)&&t.blockReasonMessage&&(s+=`: ${e.promptFeedback.blockReasonMessage}`);else if(!((r=e.candidates)===null||r===void 0)&&r[0]){const o=e.candidates[0];x(o)&&(s+=`Candidate was blocked due to ${o.finishReason}`,o.finishMessage&&(s+=`: ${o.finishMessage}`))}return s}function g(e){return this instanceof g?(this.v=e,this):new g(e)}function X(e,n,t){if(!Symbol.asyncIterator)throw new TypeError("Symbol.asyncIterator is not defined.");var r=t.apply(e,n||[]),s,o=[];return s={},i("next"),i("throw"),i("return"),s[Symbol.asyncIterator]=function(){return this},s;function i(d){r[d]&&(s[d]=function(l){return new Promise(function(O,U){o.push([d,l,O,U])>1||a(d,l)})})}function a(d,l){try{c(r[d](l))}catch(O){y(o[0][3],O)}}function c(d){d.value instanceof g?Promise.resolve(d.value.v).then(u,A):y(o[0][2],d)}function u(d){a("next",d)}function A(d){a("throw",d)}function y(d,l){d(l),o.shift(),o.length&&a(o[0][0],o[0][1])}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const L=/^data\: (.*)(?:\n\n|\r\r|\r\n\r\n)/;function V(e){const n=e.body.pipeThrough(new TextDecoderStream("utf8",{fatal:!0})),t=z(n),[r,s]=t.tee();return{stream:W(r),response:Q(s)}}async function Q(e){const n=[],t=e.getReader();for(;;){const{done:r,value:s}=await t.read();if(r)return R(Z(n));n.push(s)}}function W(e){return X(this,arguments,function*(){const t=e.getReader();for(;;){const{value:r,done:s}=yield g(t.read());if(s)break;yield yield g(R(r))}})}function z(e){const n=e.getReader();return new ReadableStream({start(r){let s="";return o();function o(){return n.read().then(({value:i,done:a})=>{if(a){if(s.trim()){r.error(new E("Failed to parse stream"));return}r.close();return}s+=i;let c=s.match(L),u;for(;c;){try{u=JSON.parse(c[1])}catch{r.error(new E(`Error parsing JSON response: "${c[1]}"`));return}r.enqueue(u),s=s.substring(c[0].length),c=s.match(L)}return o()})}}})}function Z(e){const n=e[e.length-1],t={promptFeedback:n==null?void 0:n.promptFeedback};for(const r of e)if(r.candidates)for(const s of r.candidates){const o=s.index;if(t.candidates||(t.candidates=[]),t.candidates[o]||(t.candidates[o]={index:s.index}),t.candidates[o].citationMetadata=s.citationMetadata,t.candidates[o].finishReason=s.finishReason,t.candidates[o].finishMessage=s.finishMessage,t.candidates[o].safetyRatings=s.safetyRatings,s.content&&s.content.parts){t.candidates[o].content||(t.candidates[o].content={role:s.content.role||"user",parts:[{text:""}]});for(const i of s.content.parts)i.text&&(t.candidates[o].content.parts[0].text+=i.text)}}return t}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function P(e,n,t,r){const s=new p(n,f.STREAM_GENERATE_CONTENT,e,!0),o=await m(s,JSON.stringify(t),r);return V(o)}async function D(e,n,t,r){const s=new p(n,f.GENERATE_CONTENT,e,!1),i=await(await m(s,JSON.stringify(t),r)).json();return{response:R(i)}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function h(e,n){let t=[];if(typeof e=="string")t=[{text:e}];else for(const r of e)typeof r=="string"?t.push({text:r}):t.push(r);return{role:n,parts:t}}function C(e){return e.contents?e:{contents:[h(e,"user")]}}function ee(e){return typeof e=="string"||Array.isArray(e)?{content:h(e,"user")}:e}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const G="SILENT_ERROR";class te{constructor(n,t,r,s){this.model=t,this.params=r,this.requestOptions=s,this._history=[],this._sendPromise=Promise.resolve(),this._apiKey=n,r!=null&&r.history&&(this._history=r.history.map(o=>{if(!o.role)throw new Error("Missing role for history item: "+JSON.stringify(o));return h(o.parts,o.role)}))}async getHistory(){return await this._sendPromise,this._history}async sendMessage(n){var t,r;await this._sendPromise;const s=h(n,"user"),o={safetySettings:(t=this.params)===null||t===void 0?void 0:t.safetySettings,generationConfig:(r=this.params)===null||r===void 0?void 0:r.generationConfig,contents:[...this._history,s]};let i;return this._sendPromise=this._sendPromise.then(()=>D(this._apiKey,this.model,o,this.requestOptions)).then(a=>{var c;if(a.response.candidates&&a.response.candidates.length>0){this._history.push(s);const u=Object.assign({parts:[],role:"model"},(c=a.response.candidates)===null||c===void 0?void 0:c[0].content);this._history.push(u)}else{const u=S(a.response);u&&console.warn(`sendMessage() was unsuccessful. ${u}. Inspect response object for details.`)}i=a}),await this._sendPromise,i}async sendMessageStream(n){var t,r;await this._sendPromise;const s=h(n,"user"),o={safetySettings:(t=this.params)===null||t===void 0?void 0:t.safetySettings,generationConfig:(r=this.params)===null||r===void 0?void 0:r.generationConfig,contents:[...this._history,s]},i=P(this._apiKey,this.model,o,this.requestOptions);return this._sendPromise=this._sendPromise.then(()=>i).catch(a=>{throw new Error(G)}).then(a=>a.response).then(a=>{if(a.candidates&&a.candidates.length>0){this._history.push(s);const c=Object.assign({},a.candidates[0].content);c.role||(c.role="model"),this._history.push(c)}else{const c=S(a);c&&console.warn(`sendMessageStream() was unsuccessful. ${c}. Inspect response object for details.`)}}).catch(a=>{a.message!==G&&console.error(a)}),i}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ne(e,n,t,r){const s=new p(n,f.COUNT_TOKENS,e,!1);return(await m(s,JSON.stringify(Object.assign(Object.assign({},t),{model:n})),r)).json()}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function se(e,n,t,r){const s=new p(n,f.EMBED_CONTENT,e,!1);return(await m(s,JSON.stringify(t),r)).json()}async function re(e,n,t,r){const s=new p(n,f.BATCH_EMBED_CONTENTS,e,!1),o=t.requests.map(a=>Object.assign(Object.assign({},a),{model:n}));return(await m(s,JSON.stringify({requests:o}),r)).json()}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class oe{constructor(n,t,r){this.apiKey=n,t.model.includes("/")?this.model=t.model:this.model=`models/${t.model}`,this.generationConfig=t.generationConfig||{},this.safetySettings=t.safetySettings||[],this.requestOptions=r||{}}async generateContent(n){const t=C(n);return D(this.apiKey,this.model,Object.assign({generationConfig:this.generationConfig,safetySettings:this.safetySettings},t),this.requestOptions)}async generateContentStream(n){const t=C(n);return P(this.apiKey,this.model,Object.assign({generationConfig:this.generationConfig,safetySettings:this.safetySettings},t),this.requestOptions)}startChat(n){return new te(this.apiKey,this.model,n,this.requestOptions)}async countTokens(n){const t=C(n);return ne(this.apiKey,this.model,t)}async embedContent(n){const t=ee(n);return se(this.apiKey,this.model,t)}async batchEmbedContents(n){return re(this.apiKey,this.model,n,this.requestOptions)}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ie{constructor(n){this.apiKey=n}getGenerativeModel(n,t){if(!n.model)throw new E("Must provide a model name. Example: genai.getGenerativeModel({ model: 'my-model-name' })");return new oe(this.apiKey,n,t)}}const ae=new ie("AIzaSyCpBfb6v3l1X0LUiupTjEFb6Xsah17OhUQ");class ce{constructor(){T(this,"model");this.model=ae.getGenerativeModel({model:"gemini-1.5-flash",generationConfig:{temperature:.1,topK:1,topP:1,maxOutputTokens:2048}})}async extractAssetsFromImage(n){try{const t=await this.fileToGenerativePart(n),i=(await(await this.model.generateContent(["Extract financial asset information from this image and return as JSON array with fields: name, category, currentValue, purchaseValue, confidence",t])).response).text().match(/\[[\s\S]*\]/);return i?JSON.parse(i[0]):[]}catch(t){return console.error("Error extracting assets:",t),[]}}async extractTransactionsFromImage(n){try{const t=await this.fileToGenerativePart(n),i=(await(await this.model.generateContent(["Extract transaction information from this image and return as JSON array with fields: date, description, category, type, amount, confidence",t])).response).text().match(/\[[\s\S]*\]/);return i?JSON.parse(i[0]):[]}catch(t){return console.error("Error extracting transactions:",t),[]}}async extractInsuranceFromImage(n){try{const t=await this.fileToGenerativePart(n),i=(await(await this.model.generateContent(["Extract insurance policy information from this image and return as JSON array with fields: policyName, type, coverAmount, premiumAmount, premiumFrequency, confidence",t])).response).text().match(/\[[\s\S]*\]/);return i?JSON.parse(i[0]):[]}catch(t){return console.error("Error extracting insurance:",t),[]}}async fileToGenerativePart(n){return{inlineData:{data:await new Promise(r=>{const s=new FileReader;s.onloadend=()=>{const o=s.result.split(",")[1];r(o)},s.readAsDataURL(n)}),mimeType:n.type}}}}const ue=new ce;export{ce as AIService,ue as aiService};

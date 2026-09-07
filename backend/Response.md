PS D:\Mini Project\smart-farming-assistant\backend> python test_agent.py

Testing Multi-Turn Chat Session (Memory Feature)


[Turn 1] User: My soil has N=80 P=90 K=88 pH=9, 1 acre in Kottayam. what should i plant?  

[Turn 1] Tools Called:
  - weather_lookup {'district': 'Kottayam', 'forecast_days': 3}
  - crop_recommendation_model {'rainfall': 200, 'K': 88, 'humidity': 80, 'P': 90, 'N': 80, 'temperature': 27, 'ph': 9}
  - crop_calendar_lookup {'crop_name': 'banana'}
  - companion_rules_lookup {'crop_name': 'banana'}
  - yield_prediction_model {'season': 'Whole Year', 'state': 'Kerala', 'annual_rainfall': 3000, 'crop': 'banana', 'farm_area': 0.4047}
  - market_price_lookup {'commodity': 'banana', 'district': 'Kottayam'}
  - kau_knowledge_search {'top_k': 3, 'query': 'banana cultivation fertilizer schedule spacing planting method alkaline soil pH'}

[Turn 1] Agent Answer (Session ID: 6d329210-6a2f-46b3-b8d7-8bf1df1b3e79):
### **Crop Recommendation & Farm Strategy**

---

### **Key Insights**

#### **1. ML-Verified Crop Recommendation**
* **Primary Recommendation:** **Banana**
* **Model Confidence Note:** The recommendation model flagged this as a low-confidence match (below 50%), primarily due to your highly alkaline soil pH of 9.0. The top alternative crop suggested by the model is **Chickpea**.
* **Soil Context (pH 9.0):** Soil with a pH of 9 is highly alkaline for banana, which typically thrives in slightly acidic to neutral soils (pH 6.0–7.5). High pH can lock up micronutrients like iron, zinc, and manganese, requiring active soil conditioning (e.g., organic matter addition and micronutrient sprays).   

#### **2. Expected Yield Estimate**
* **Farm Size:** 1 acre (~0.4047 hectares) in Kottayam
* **Expected Yield Rate:** ~7.44 tons per hectare
* **Total Estimated Harvest:** **~3.01 tons** for your 1-acre plot over the full crop cycle.

---

### **Actionable Advice**

#### **1. Planting Window & Timing (Malayalam Calendar)**
* **Planting Window:** Traditional planting is best done during **Chingam to Kanni** (*mid-August to mid-October*), especially for target harvesting during the Onam season.
* **Harvest Window:** Bananas are harvested year-round, typically **10 to 12 months** after planting, when bunches turn plump and angle-free.
* *Note on Weather Data:* A temporary weather service lookup error occurred (503 Service Error), so live short-term forecast data is temporarily unavailable. Please monitor local Kottayam weather forecasts before field operations.       

---

#### **2. Intercropping & Companion Crops**
Based on traditional intercropping practices:
* **Ginger & Turmeric:** Excellent understory companions that tolerate shade well during banana's early leaf canopy growth stage.
* **Cowpea:** Ideal early-stage green manure and cover crop sown between banana rows while the main canopy develops.

---

#### **3. Agronomic Practice & Soil Management (KAU Guidelines)**
*(Source: KAU Package of Practices, Pages 210, 218, 394)*

* **Spacing & Density:**
  * Plant at **2 m x 2 m** spacing (~2,500 plants/ha, or roughly 1,000 plants per acre).
  * High-density planting options: **2 m x 3 m** with 2 plants per pit.        

* **Fertilizer & Soil Amending Schedule:**
  * **Standard NPK Dose (e.g., cv. Nendran):** **143 g N : 85 g P₂O₅ : 225 g K₂O** per plant applied in split doses.
  * **Green Manuring (Crucial for Alkaline Soil):** Sow sunn hemp, daincha, or cowpea at **50 kg/ha** in inter-spaces right after planting banana. Incorporate it into the soil after 40 days. Repeat this green manure cycle once more. Incorporating cowpea allows you to reduce NPK fertilizer to 75% of the recommended dose while maintaining high yield efficiency.
  * **Micronutrient Application (Banana Micromix):** High pH soil can lock up micronutrients. Apply KAU Banana Micromix at **4 g/plant** (or 10 kg/ha containing Iron, Manganese, Zinc, Boron, and Copper) with the 2nd split dose of NPK, or spray as a 1% foliar solution (4 g per 400 ml water per plant) 3 months after planting.

* **Irrigation & Drainage:**
  * During dry summer periods, irrigate once every 3 days (or pot irrigation @ 9 liters once every 15 days during early sucker establishment).
  * Ensure clear drainage channels to avoid standing waterlogging around roots.

---

#### **4. Market Price Context**
* **Market Update:** Real-time mandi wholesale prices for banana in Kottayam district are currently unavailable from Agmarknet sources.
* **Seasonal Market Dynamics:** Bananas yield year-round, but local market supply peaks during major festive windows (such as Onam), which influences local farmgate prices.

[Turn 2] User: What is the best fertilizer for this plant and what is the market price of it in 6 months?
(Sending with session_id: 6d329210-6a2f-46b3-b8d7-8bf1df1b3e79)

[Turn 2] Tools Called:
  - kau_knowledge_search {'query': 'banana fertilizer requirement schedule application NPK organic manure', 'top_k': 3}
  - market_price_lookup {'district': 'Kottayam', 'commodity': 'banana'}        
  - crop_calendar_lookup {'crop_name': 'banana'}

[Turn 2] Agent Answer:
### **Key Insights**

#### **1. Fertilizer & Nutrient Strategy**
* **Core Nutrition:** Bananas are heavy feeders requiring a strong base of organic manure combined with balanced **NPK (Nitrogen, Phosphorus, Potassium)** applied in split doses.
* **Special Considerations for pH 9 Soil:** Highly alkaline soil locks up vital micro-nutrients like zinc, iron, and boron. Applying **Banana Micromix** along with organic green manuring (cowpea) is crucial to correct soil alkalinity and maintain full yield potential.

#### **2. Market Price & 6-Month Outlook**
* **Current Mandi Data:** Agmarknet currently has no live market price reporting for banana in Kottayam district.
* **6-Month Price Context:** Bananas take **10 to 12 months** to reach full harvest maturity after planting. At 6 months, your crop will be in its active vegetative and budding stage rather than harvest-ready. Statewide prices fluctuate seasonally, typically peaking during the **Onam festival season (Chingam)** due to high demand for cultivars like Nendran, and softening slightly during peak harvest arrivals.

---

### **Actionable Advice**

#### **1. Recommended Fertilizer Schedule (KAU Guidelines)**
*(Source: KAU Package of Practices, Pages 218 & 394)*

* **Basal Application (At Planting):**
  * Apply **10 to 15 kg of well-rotted Farmyard Manure (FYM) or compost** per pit during soil preparation.

* **Chemical Fertilizer Dosage (per plant for cultivars like Nendran):**       
  * **Nitrogen (N):** 143 g per plant
  * **Phosphorus (P₂O₅):** 85 g per plant
  * **Potassium (K₂O):** 225 g per plant

* **Application Schedule (Split Doses):**
  * **1st Split (1.5 to 2 months after planting):** Apply half the Phosphorus and one-third of Nitrogen and Potassium.
  * **2nd Split (3 months after planting):** Apply the remaining Phosphorus along with one-third of N and K.
  * **3rd Split (5 months after planting / pre-flowering):** Apply the remaining one-third of N and K.

* **Integrated Nutrient Management (Green Manuring):**
  * Sow cowpea seeds in the inter-spaces at **50 kg/ha** immediately after planting banana.
  * Incorporate the cowpea plants back into the soil **40 days after sowing**. 
  * Repeat this green manuring cycle once more. Incorporating cowpea allows you to reduce chemical fertilizer doses by 25% while maintaining top yield efficiency.

* **Micronutrient Correction for High pH Soil (Banana Micromix):**
  * Apply **Banana Micromix** at **4 g per plant** (10 kg/ha) mixed with the 2nd split dose of chemical fertilizer.
  * Alternatively, apply a **1% foliar spray** (dissolve 4 g Banana Micromix in 400 ml water per plant) at 3 months after planting to prevent zinc and iron deficiencies caused by high soil pH.

---

#### **2. Planning for Harvest & Market Decisions**
* **Growth Timeline:** If planted between **Chingam and Kanni** (mid-August to mid-October), plants will be mid-way through development at the 6-month mark. Harvest will take place between 10 and 12 months when the fruit bunches turn full and rounded.
* **Market Monitoring Strategy:** Keep track of local Kottayam market trends as your crop nears flowering (7–8 months in), especially if timing harvest for major festive demand windows when prices reach their seasonal high.


Testing /agent/sessions endpoint history retrieval

Creating/Fetching session for farm: None

Session Endpoint Response:

  "session_id": "19fc99a7-1a0f-49fc-a1b9-ca89fecddf92",

#### **2. Planning for Harvest & Market Decisions**
* **Growth Timeline:** If planted between **Chingam and Kanni** (mid-August to mid-October), plants will be mid-way through development at the 6-month mark. Harvest will take place between 10 and 12 months when the fruit bunches turn full and rounded.
* **Market Monitoring Strategy:** Keep track of local Kottayam market trends as your crop nears flowering (7–8 months in), especially if timing harvest for major festive demand windows when prices reach their seasonal high.

Testing /agent/sessions endpoint history retrieval


Creating/Fetching session for farm: None

Session Endpoint Response:
{
  "session_id": "19fc99a7-1a0f-49fc-a1b9-ca89fecddf92",
  "messages": []
}
PS D:\Mini Project\smart-farming-assistant\backend>


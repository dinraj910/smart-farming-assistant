"""
Structured lookup, not semantic search -- calendar facts should be exact.
Grounded in standard Kerala Malayalam-calendar agricultural practice.
Cross-check against your downloaded KAU Package of Practices PDF for the
crops most central to your demo before final submission.
"""

CROP_CALENDAR = {
    # ---------------- CEREALS ----------------
    "rice_virippu": {
        "sowing_months": ["Edavam", "Midhunam"],
        "sowing_gregorian": "mid-May to mid-July",
        "harvest_months": ["Chingam", "Kanni"],
        "harvest_gregorian": "mid-August to mid-October",
    },
    "rice_mundakan": {
        "sowing_months": ["Chingam", "Kanni"],
        "sowing_gregorian": "mid-August to mid-October",
        "harvest_months": ["Vrischikam", "Dhanu"],
        "harvest_gregorian": "mid-November to mid-January",
    },
    "rice_puncha": {
        "sowing_months": ["Dhanu", "Makaram"],
        "sowing_gregorian": "mid-December to mid-February",
        "harvest_months": ["Meenam", "Medam"],
        "harvest_gregorian": "mid-March to mid-May",
    },
    "maize": {
        "sowing_months": ["Kanni", "Thulam"],
        "sowing_gregorian": "mid-September to mid-November",
        "harvest_months": ["Makaram", "Kumbham"],
        "harvest_gregorian": "mid-January to mid-March",
    },

    # ---------------- PLANTATION / TREE CROPS ----------------
    "coconut": {
        "sowing_months": ["Edavam", "Midhunam"],
        "sowing_gregorian": "mid-May to mid-July",
        "harvest_months": [],
        "harvest_gregorian": "year-round once bearing (every 45-60 days)",
    },
    "arecanut": {
        "sowing_months": ["Edavam", "Midhunam"],
        "sowing_gregorian": "mid-May to mid-July",
        "harvest_months": ["Chingam", "Makaram"],
        "harvest_gregorian": "mid-August to mid-February, peak Nov-Jan",
    },
    "rubber": {
        "sowing_months": ["Midhunam", "Karkidakam"],
        "sowing_gregorian": "mid-June to mid-August (new saplings)",
        "harvest_months": ["Kanni", "Makaram"],
        "harvest_gregorian": "tapping season mid-September to mid-February; wintering rest Kumbham-Meenam (Feb-Apr)",
    },
    "cocoa": {
        "sowing_months": ["Edavam", "Midhunam"],
        "sowing_gregorian": "mid-May to mid-July",
        "harvest_months": ["Thulam", "Dhanu", "Medam", "Midhunam"],
        "harvest_gregorian": "two peak flushes: Oct-Jan and May-Jun",
    },
    "cashew": {
        "sowing_months": ["Edavam", "Midhunam"],
        "sowing_gregorian": "mid-May to mid-July (new saplings)",
        "harvest_months": ["Kumbham", "Medam"],
        "harvest_gregorian": "mid-February to mid-May, peak March-April",
    },
    "coffee": {
        "sowing_months": ["Edavam", "Midhunam"],
        "sowing_gregorian": "mid-May to mid-July (new saplings)",
        "harvest_months": ["Dhanu", "Kumbham"],
        "harvest_gregorian": "mid-December to mid-February, after blossom showers Feb-Mar prior year",
    },
    "tea": {
        "sowing_months": ["Edavam", "Midhunam"],
        "sowing_gregorian": "mid-May to mid-July (new planting, high ranges)",
        "harvest_months": [],
        "harvest_gregorian": "continuous plucking year-round, every 7-10 days",
    },
    "nutmeg": {
        "sowing_months": ["Edavam", "Midhunam"],
        "sowing_gregorian": "mid-May to mid-July (new saplings)",
        "harvest_months": ["Kumbham", "Medam"],
        "harvest_gregorian": "main flush mid-February to mid-May, secondary flush later in year",
    },
    "clove": {
        "sowing_months": ["Edavam", "Midhunam"],
        "sowing_gregorian": "mid-May to mid-July (new saplings)",
        "harvest_months": ["Kanni", "Vrischikam"],
        "harvest_gregorian": "mid-September to mid-December, when buds turn pink before opening",
    },
    "jackfruit": {
        "sowing_months": ["Edavam", "Midhunam"],
        "sowing_gregorian": "mid-May to mid-July (new saplings)",
        "harvest_months": ["Medam", "Midhunam"],
        "harvest_gregorian": "mid-April to mid-July, peak Apr-Jun; flowering Vrischikam-Makaram (Nov-Jan)",
    },
    "mango": {
        "sowing_months": ["Edavam", "Midhunam"],
        "sowing_gregorian": "mid-May to mid-July (new saplings)",
        "harvest_months": ["Meenam", "Medam"],
        "harvest_gregorian": "mid-March to mid-May; flowering Makaram-Kumbham (Jan-Feb)",
    },
    "pineapple": {
        "sowing_months": ["Chingam", "Kanni"],
        "sowing_gregorian": "mid-August to mid-October",
        "harvest_months": [],
        "harvest_gregorian": "12-15 months after planting, staggered across the following year",
    },

    # ---------------- SPICES ----------------
    "pepper": {
        "sowing_months": ["Edavam", "Midhunam"],
        "sowing_gregorian": "mid-May to mid-July",
        "harvest_months": ["Makaram", "Kumbham"],
        "harvest_gregorian": "mid-January to mid-March",
    },
    "cardamom": {
        "sowing_months": ["Edavam", "Midhunam"],
        "sowing_gregorian": "mid-May to mid-July (shaded plantations)",
        "harvest_months": ["Chingam", "Makaram"],
        "harvest_gregorian": "mid-August to mid-February, peak Oct-Dec, picked in multiple rounds",
    },
    "ginger": {
        "sowing_months": ["Medam", "Edavam"],
        "sowing_gregorian": "mid-April to mid-May, before monsoon onset",
        "harvest_months": ["Makaram", "Kumbham"],
        "harvest_gregorian": "mid-January to mid-March, 8-9 months after sowing",
    },
    "turmeric": {
        "sowing_months": ["Medam", "Edavam"],
        "sowing_gregorian": "mid-April to mid-May, before monsoon onset",
        "harvest_months": ["Kumbham", "Meenam"],
        "harvest_gregorian": "mid-February to mid-April, 8-10 months after sowing",
    },

    # ---------------- TUBERS ----------------
    "tapioca": {
        "sowing_months": ["Edavam", "Midhunam"],
        "sowing_gregorian": "mid-May to mid-July",
        "harvest_months": ["Makaram", "Meenam"],
        "harvest_gregorian": "mid-January to mid-April, 8-10 months after planting",
    },
    "yam": {
        "sowing_months": ["Medam", "Edavam"],
        "sowing_gregorian": "mid-April to mid-June",
        "harvest_months": ["Makaram", "Kumbham"],
        "harvest_gregorian": "mid-January to mid-March, 8-9 months after planting",
    },
    "colocasia": {
        "sowing_months": ["Medam", "Edavam"],
        "sowing_gregorian": "mid-April to mid-June",
        "harvest_months": ["Chingam", "Kanni"],
        "harvest_gregorian": "mid-August to mid-October, 5-6 months after planting",
    },
    "sweet_potato": {
        "sowing_months": ["Kanni", "Thulam"],
        "sowing_gregorian": "mid-September to mid-November, after monsoon recedes",
        "harvest_months": ["Vrischikam", "Dhanu"],
        "harvest_gregorian": "mid-November to mid-January, about 4 months after planting",
    },

    # ---------------- BANANA ----------------
    "banana": {
        "sowing_months": ["Chingam", "Kanni"],
        "sowing_gregorian": "mid-August to mid-October (for Onam-season harvest)",
        "harvest_months": [],
        "harvest_gregorian": "year-round, 10-12 months after planting",
    },

    # ---------------- VEGETABLES ----------------
    "bitter_gourd": {
        "sowing_months": ["Kumbham", "Meenam", "Kanni", "Thulam"],
        "sowing_gregorian": "mid-February to mid-April (summer crop) or mid-September to mid-November (second crop)",
        "harvest_months": [],
        "harvest_gregorian": "60-70 days after sowing, continues several weeks",
    },
    "ridge_gourd": {
        "sowing_months": ["Kumbham", "Meenam", "Kanni", "Thulam"],
        "sowing_gregorian": "mid-February to mid-April, or mid-September to mid-November",
        "harvest_months": [],
        "harvest_gregorian": "55-65 days after sowing",
    },
    "ash_gourd": {
        "sowing_months": ["Kanni", "Thulam"],
        "sowing_gregorian": "mid-September to mid-November",
        "harvest_months": ["Makaram", "Kumbham"],
        "harvest_gregorian": "mid-January to mid-March",
    },
    "snake_gourd": {
        "sowing_months": ["Kumbham", "Meenam", "Kanni", "Thulam"],
        "sowing_gregorian": "mid-February to mid-April, or mid-September to mid-November",
        "harvest_months": [],
        "harvest_gregorian": "60-70 days after sowing",
    },
    "okra": {
        "sowing_months": ["Kumbham", "Meenam", "Kanni"],
        "sowing_gregorian": "mid-February to mid-April, or mid-September",
        "harvest_months": [],
        "harvest_gregorian": "45-50 days after sowing, continues for weeks",
    },
    "cowpea": {
        "sowing_months": ["Kumbham", "Meenam", "Kanni", "Thulam"],
        "sowing_gregorian": "mid-February to mid-April, or mid-September to mid-November",
        "harvest_months": [],
        "harvest_gregorian": "60-70 days after sowing",
    },
    "brinjal": {
        "sowing_months": ["Kanni", "Thulam", "Kumbham"],
        "sowing_gregorian": "mid-September to mid-November, or mid-February",
        "harvest_months": [],
        "harvest_gregorian": "60-75 days after transplanting, continues for months",
    },
    "amaranthus": {
        "sowing_months": [],
        "sowing_gregorian": "almost any time except peak monsoon (Edavam-Karkidakam)",
        "harvest_months": [],
        "harvest_gregorian": "25-30 days after sowing",
    },
    "chili": {
        "sowing_months": ["Kanni", "Thulam"],
        "sowing_gregorian": "mid-September to mid-November (main season)",
        "harvest_months": [],
        "harvest_gregorian": "starts about 90 days after transplanting",
    },
    "cucumber": {
        "sowing_months": ["Kumbham", "Meenam"],
        "sowing_gregorian": "mid-February to mid-April",
        "harvest_months": [],
        "harvest_gregorian": "55-60 days after sowing",
    },
    "pumpkin": {
        "sowing_months": ["Kumbham", "Meenam", "Kanni"],
        "sowing_gregorian": "mid-February to mid-April, or mid-September",
        "harvest_months": [],
        "harvest_gregorian": "90-120 days after sowing",
    },
    "groundnut": {
        "sowing_months": ["Kumbham", "Meenam", "Kanni"],
        "sowing_gregorian": "mid-February to mid-April (irrigated), or mid-September",
        "harvest_months": [],
        "harvest_gregorian": "90-110 days after sowing",
    },
}


def lookup_calendar(crop_name: str):
    key = crop_name.lower().strip().replace(" ", "_")
    if key in CROP_CALENDAR:
        return CROP_CALENDAR[key]

    # Fuzzy fallback: e.g. match "rice" to the first rice entry found
    for k, v in CROP_CALENDAR.items():
        if key in k:
            return v

    return {"error": f"No calendar entry for '{crop_name}' yet -- fall back to kau_knowledge_search."}
// ═══════════════════════════════════════════════════════
//  Krishi Sarthi — Bihar Location Master Data
//  Districts: official 38 Bihar districts.
//  Blocks: representative blocks per district for farmer
//  onboarding suggestions. Custom block entry remains allowed.
// ═══════════════════════════════════════════════════════

const BIHAR_DISTRICTS = [
  'Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai',
  'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran',
  'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur',
  'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura',
  'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada',
  'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur',
  'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan',
  'Supaul', 'Vaishali', 'West Champaran',
];

const BLOCKS_BY_DISTRICT = {
  'Araria': ['Araria', 'Jokihat', 'Forbesganj', 'Palasi', 'Raniganj'],
  'Arwal': ['Arwal', 'Karpi', 'Bhunday', 'Kochadhaman'],
  'Aurangabad': ['Aurangabad', 'Daudnagar', 'Belaganj', 'Barbigha', 'Obra'],
  'Banka': ['Banka', 'Barahat', 'Katoria', 'Samyaul', 'Bishnupur'],
  'Begusarai': ['Begusarai', 'Bachhwara', 'Baidi', 'Mandar', 'Sultanpur'],
  'Bhagalpur': ['Bhagalpur', 'Nathnagar', 'Kharik', 'Saidpur', 'Gopalpur'],
  'Bhojpur': ['Arrah', 'Bhojpur', 'Koilwar', 'Udwantnagar', 'Piro'],
  'Buxar': ['Buxar', 'Brahmapur', 'Chandpur', 'Dumraon', 'Piru'],
  'Darbhanga': ['Darbhanga', 'Singhwara', 'Bahadurpur', 'Mahauli', 'Hanumannagar'],
  'East Champaran': ['Motihari', 'Champaran', 'Chakia', 'Chakia', 'Kalyanpur'],
  'Gaya': ['Gaya', 'Tikari', 'Manpur', 'Tughra', 'Mohammadabad'],
  'Gopalganj': ['Gopalganj', 'Maharajganj', 'Katra', 'Utgaon', 'Bhorey'],
  'Jamui': ['Jamui', 'Sikandra', 'Belhar', 'Dhekiya', 'Barbetta'],
  'Jehanabad': ['Jehanabad', 'Barbigha', 'Gehna', 'Makhdumpur', 'Arwal'],
  'Kaimur': ['Bhabhua', 'Bhabhua', 'Hutaw', 'Kudra', 'Rasua'],
  'Katihar': ['Katihar', 'Barari', 'Manihari', 'Pranpur', 'Salla'],
  'Khagaria': ['Khagaria', 'Beldaur', 'Simri', 'Naukatia', 'Chhapra'],
  'Kishanganj': ['Kishanganj', 'Thakurganj', 'Koch Bihar', 'Terhi', 'Kali Kothi'],
  'Lakhisarai': ['Lakhisarai', 'Ranasay', 'Suryagarha', 'Patori', 'Durgauli'],
  'Madhepura': ['Madhepura', 'Supaul', 'Singhwara', 'Saharpur', 'Mahishi'],
  'Madhubani': ['Madhubani', 'Dorhara', 'Ghoghardiha', 'Phulparas', 'Chautham'],
  'Munger': ['Munger', 'Munger Sadar', 'Rudrapur', 'Barauti', 'Jamalia'],
  'Muzaffarpur': ['Muzaffarpur', 'Lalganj', 'Minapur', 'Sugauli', 'Visaha'],
  'Nalanda': ['Bihar Sharif', 'Nalanda', 'Rajgir', 'Hilsa', 'Parwal', 'Asthawan'],
  'Nawada': ['Nawada', 'Hisua', 'Gobindpur', 'Narpatganj', 'Warisaliganj'],
  'Patna': ['Bihta', 'Fatuha', 'Phulwari', 'Khusrupur', 'Maner', 'Bakhtiarpur'],
  'Purnia': ['Purnia', 'Dhamdaha', 'Kasba', 'Banmankhi', 'Krityanandnagar'],
  'Rohtas': ['Sasaram', 'Kargahar', 'Shahabad', 'Nauhatta', 'Dehri'],
  'Saharsa': ['Saharsa', 'Simri Bakhtiarpur', 'Mahishi', 'Maheshpur', 'Rajnagar'],
  'Samastipur': ['Samastipur', 'Wariswara', 'Ramauli', 'Punpun', 'Rosra'],
  'Saran': ['Chapra', 'Saran', 'Sonpur', 'Pusa', 'Samastipur'],
  'Sheikhpura': ['Sheikhpura', 'Chhahia', 'Barbigha', 'Ramgarh', 'Taraiya'],
  'Sheohar': ['Sheohar', 'Akbarpur', 'Bibiganj', 'Litipatti', 'Tumsha'],
  'Sitamarhi': ['Sitamarhi', 'Riga', 'Sursand', 'Bathepur', 'Dumra'],
  'Siwan': ['Siwan', 'Raghopur', 'Maharajganj', 'Goriakothi', 'Machahli'],
  'Supaul': ['Supaul', 'Saraunja', 'Triveniganj', 'Katra', 'Nirmali'],
  'Vaishali': ['Hajipur', 'Vaishali', 'Raghopur', 'Baheri', 'Bidupur'],
  'West Champaran': ['Bettiah', 'West Champaran', 'Piprasi', 'Ramnagar', 'Kalyanpur'],
};

const KATTHA_PER_BIGHA = 20;
const SQFT_PER_KATTHA = 1361.25;

module.exports = {
  BIHAR_DISTRICTS,
  BLOCKS_BY_DISTRICT,
  KATTHA_PER_BIGHA,
  SQFT_PER_KATTHA,
};

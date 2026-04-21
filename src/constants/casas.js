export const CASAS_DEFAULT = [
  "4play","4win","7K","ALFA","Aposta Ganha","BandBet","Bateu","Bet boom",
  "Bet365","BetBoom","Betaki","Betão","Betbra","BetdaSorte","Betespecial",
  "Betfair","Betfalcons","BETMGM","Betnacional","Betnou","Betou","BETPIX365",
  "Betsson","Betsul","BetVip","BetWarrior","Bolsa de Aposta","Br4BET",
  "BrasildaSorte","BullsBet","Casa de Apostas","Esportes da Sorte","EsportivaBET",
  "EstrelaBet","F12","Faz1","FullTBet","GanheiBET","GOLDEBET","HiperBet",
  "Jogo de Ouro","KingPanda","KTO","LancedeSorte","Lottu","LotoGreen","Luva",
  "MarjoSports","MatchBook","MCgames","MeridianBET","MultiBet","Novibet",
  "Pagol","Pinnacle","Pixbet","Playbet","Rei do Pitaco","Rivalo","SeguroBet",
  "SortenaBET","Sportingbet","SportyBet","Stake","SUPERBET","Tivobet",
  "Uxbet","Vaidebet","Versus","Vbet","Vivasorte","Vupi","BETesporte","Betano",
].filter((v, i, a) => a.indexOf(v) === i)
  .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

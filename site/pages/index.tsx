// import { useAlone } from 'am-i-alone';

function Home() {
  const { alone, count } = { alone: false, count: 1 };
  
  const verb = count === 1 ? 'is' : 'are';
  const suffix = count === 1 ? '' : 's';
  const text = alone ? 'yes' : 'no';
  
  return (
    <div>
      <div className="title">{text}</div>
      <div className="text">{!alone && `There ${verb} ${count} other${suffix}`}</div>
    </div>
  );
};

export default Home;

import { useState, Fragment, useEffect } from 'react';

const types = [
  { value: 'qixin', label: '企信' },
  { value: 'amap', label: '高德ip' },
  { value: 'browser', label: '浏览器原生' },
];

function Loading({ title }) {
  return (
    <div className='loading-wrapper'>
      <div className='loading' />
      <span>{ title || '加载中...'} </span>
    </div>
  )
}

const inQX = () => !!window.flutter_inappwebview;
const logger = (data, title) => console.log(title || '', JSON.stringify(data))
let QxResolve = () => {}

const getQxLocation = (timeout = 10000) => {
  const callHandler = window.flutter_inappwebview.callHandler;
  if(callHandler) {
    callHandler('Notify', { 
      type: 'get-location', 
      data: 'only' 
    });
  }

  return new Promise((resolve, reject) => {
    QxResolve = resolve;
    setTimeout(() => {
      reject(new Error('企信获取定位超时, 请重启企信app试下'));
    }, timeout)
  });
}

const getBrowserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) reject(new Error('当前浏览器不支持定位api'))
    
    navigator.geolocation.getCurrentPosition(res => {
      console.log(res)
      if (res && res.coords) {
        resolve({
          lat: res.coords.latitude,
          lng: res.coords.longitude
        })
      }
    }, (err) => reject(err), {
      timeout: 3000,
      enableHighAccuracy: true
    });
  })
}

const getAmapLocation = async () => {
  if (!window.AMapLoader) return new Error('高德api未正确注入');

  const aMap = await window.AMapLoader.load({
    key: '2a2fe6ea0e479ce13d183c8500ba72a4',
    version: '2.0',
    plugins: [
      'AMap.Geocoder', //查询地址信息
      'AMap.Geolocation', //定位当前位置
    ],
  });

  const Geolocation = new aMap.Geolocation({
    enableHighAccuracy: true,
    // 设置定位超时时间
    timeout: 6000,
  });

  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition((status, result) => {
      //当前定位成功
      if (status === 'complete') {
        resolve({
          lng: result.position.lng,
          lat: result.position.lat
        })
      }

      reject(result)
    })
  });
}

export default function App() {
  const [type, setType] = useState('qixin')
  const [loading, setLoading] = useState(false)
  const [position, setPosition] = useState(null);

  const getLocation = async () => {
    if (type === 'qixin' && !inQX()) {
      alert('未检测到企信注入的API, 请检测环境!'); return;
    }

    setLoading(true);
    setPosition(null);
    try {
      if (type === 'qixin') {
        const res = await getQxLocation();
        if (res.data) {
          setPosition({
            lng: res.data.longitude,
            lat: res.data.latitude
          })
        }
      } else if (type === 'browser') {
        const res = await getBrowserLocation();
        setPosition(res)
      } else {
        const res = await getAmapLocation();
        setPosition(res)
      }
    } catch (error) {
      logger(error)
      alert(error?.message);
    } finally {
      setLoading(false)
    }
  }

  const getFlag = () => {
    const callHandler = window.flutter_inappwebview.callHandler;
    if(callHandler) {
      callHandler('Notify', { 
        type: 'get-flag', 
        data: '' 
      });
    }
  }

  useEffect(() => {
    if (inQX()) {
      window.__customMobileEvent = function (e) {
        logger(e, '企信api回调：');
        QxResolve(e);
      };
    }
  }, []);

  return (
    <>
      <div>
        <span>定位类型： </span>
        {
          types.map(({ label, value }) => {
            return (
              <Fragment key={value}>
                <input 
                  type="radio" 
                  name="type" 
                  value={value} 
                  id={value} 
                  checked={type === value}
                  onChange={e => setType(e.target.value)}
                />
                <label htmlFor={value}>{ label }</label>
              </Fragment>
            )
          })
        }
      </div>
      <div>
        <button onClick={getLocation} className='btn' disabled={loading}>获取定位</button>
        <button onClick={getFlag} className='btn' disabled={loading}>get flag</button>
      </div>
      {
        loading &&
        <Loading title='定位中...'/> 
      }
      {
        !loading && position &&
        <div>
          <p>经度： {position?.lng}</p>
          <p>纬度： {position?.lat}</p>
        </div>
      }
      
    </>
  )
}